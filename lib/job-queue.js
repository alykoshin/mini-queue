/**
 * Created by alykoshin on 03.02.16.
 */

'use strict';

const EventEmitter = require('events');
const util = require('util');
const debug = require('debug')('queue');

const MAX_JOURNAL_LENGTH = 100;

/*
 * For state diagram please refer to README.md
 */

const QueueJob = function(id, queue, data, options) {
  const self = this;
  EventEmitter.call(this);
  options = options || {};

  self.id      = id;
  self.queue   = queue;
  self.data    = data;
  self.options = options;
  self.name    = options.name;
  self.group   = options.group;
  self.status  = 'new';
  self.journalEntry = {
    id:    id,
    'new': new Date(),
  };

  self.log = function(...args) {
    let s = args.shift() || '';
    s = util.format('[%d] %s', self.id, s);
    args.unshift(s);
    self.queue.log.apply(this, args);
  };
};
util.inherits(QueueJob, EventEmitter);


const JobQueue = function(config) {
  const self = this;
  EventEmitter.call(this);

  config = config || {};
  config.activeLimit = typeof config.activeLimit !== 'undefined' ? config.activeLimit : -1;
  config.queuedLimit = typeof config.queuedLimit !== 'undefined' ? config.queuedLimit : -1;
  config.maxJournalLength = typeof config.maxJournalLength !== 'undefined' ? config.maxJournalLength : MAX_JOURNAL_LENGTH;

  self.activeCount = 0;
  self.totalCount  = 0;
  const queue        = [];
  const active       = []; // holds active jobs

  self.getLength = function() {
    return queue.length;
  };

  self.journal = {}; // This will journal a jobs

  self.log = function(...args) {
    let s = args.shift() || '';
    s = util.format('(%d/%d %d/%d %d) %s', self.activeCount, config.activeLimit, self.getLength(), config.queuedLimit, self.totalCount, s);
    args.unshift(s);
    //console.log.apply(this, args);
    debug.apply(this, args);
  };


  // get active or queued job by id
  // jobs at some states (dequeued, rejected etc) can not be found by this method
  self.getJob = function(jobId) {
    // Look inside active jobs
    for (var len=active.length, i=0; i<len; ++i) {
      if(active[i].id === jobId) {
        return active[i];
      }
    }
    // look inside queued jobs
    for (var len=queue.length, i=0; i<len; ++i) {
      if(queue[i].id === jobId) {
        return queue[i];
      }
    }
    return null;
  };

  self._generateId = function() {
    self.totalCount++;
    if (self.totalCount >= Number.MAX_SAFE_INTEGER) { self.totalCount = 0; }
    return self.totalCount;
  };


  self.createJob = function(data, options) {
    options = options || {};
    options.group = options.group || 'default';
    options.name  = options.name  || 'default';
    if (!self.journal.hasOwnProperty(options.group)) self.journal[options.group] = {};
    if (!self.journal[options.group].hasOwnProperty(options.name)) self.journal[options.group][options.name] = [];

    const job =  new QueueJob(self._generateId(), self, data, options);
    job.journalEntry.create = new Date();
    self.journal[options.group][options.name].unshift(job.journalEntry);
    self.journal[options.group][options.name].splice(config.maxJournalLength );//Clip journal length

    job.log('createJob()');

    // All processing to be handled on nextTick to allow to set listeners after creation
    process.nextTick(function() {
      if (!self._canQueue()) {
        self._rejectJob(job);
        return job;
      }
      if (self._canStart() && queue.length === 0) {
        self._startJob(job);
      } else {
        self._queueJob(job);
      }
    });
    process.nextTick(self._checkQueue);
    //self._checkQueue();
    //self._queueJob(job);
    //process.nextTick(self._checkQueue);

    return job;
  };


  self._queueJob = function(job) {

    const onJobCancel = function(err, result) {
      self._onJobCancel(job, err, result);
    };

    queue.push(job);

    job.status = 'queue';
    job.journalEntry.queue = new Date();
    job.log('_queueJob()');
    job.emit('queue', onJobCancel);

    self.emit('queue', job, onJobCancel);

  };

  /**
   *
   * @param {QueueJob} [job] - Job to dequeue (first if empty)
   * @returns {QueueJob}
   * @private
   */
  self._dequeueJob = function(job) {
    if (job) {
      let i = queue.indexOf(job);
      if (i < 0) {
        self.log('_dequeueJob(): job [%d] not found', job.id);
      } else {
        queue.splice(i, 1);
        job.log('_dequeueJob(): index: %d', i);
      }
    } else {
      job = queue.shift();
    }

    job.status = 'dequeue';
    job.journalEntry.dequeue = new Date();
    job.log('_dequeueJob()');
    job.emit('dequeue');

    self.emit('dequeue', job);

    return job;
  };


  self._startJob = function(job) {
    job.log('_startJob()');
    self.activeCount++;
    active.push(job); // store to array of active jobs

    job.status = 'process';
    job.journalEntry.process = new Date();
    job.emit('process', function(err, result) {
      self._onJobComplete(job, err, result);
    });

    self.emit('process', job, function(err, result) {
      self._onJobComplete(job, err, result);
    });
    //job.data.next();
  };


  self._onJobComplete = function(job, err, result) {
    job.log('_onJobComplete(): err: %j, result: %j', err, result);
    let i = active.indexOf(job);
    if (i < 0) {
      self.log('_onJobComplete(): job [%d] not found', job.id);
    } else {
      active.splice(i, 1);
      job.log('_onJobComplete(): index: %d', i);
      self.activeCount--;
    }

    job.status = 'complete';
    job.journalEntry.complete = new Date();
    job.emit('complete', err, result);

    self.emit('complete', job, err, result);

    process.nextTick(self._checkQueue);
    //self._checkQueue();
  };


  self._terminateJob = function(/*job*/) {
    throw new Error('Not implemented');
  };


  self._onJobCancel = function(job) {
    job.log('_onJobCancel()');
    self._cancelJob(job);
  };


  /**
   * Reject job (job is new)
   *
   * @param job
   * @private
   */
  self._rejectJob = function(job) {
    job.log('_rejectJob()');
    job.status = 'reject';
    job.journalEntry.reject = new Date();
    job.emit('reject');
    self.emit('reject', job);
  };


  /**
   * Cancel job (job is in queue)
   *
   * @param job
   * @private
   */
  self._cancelJob = function(job) {
    job.log('_cancelJob()');
    self._dequeueJob(job);
    job.status = 'cancel';
    job.journalEntry.cancel = new Date();
    job.emit('cancel');
    self.emit('cancel', job);
  };


  self._canStart = function() {
    return self.activeCount < config.activeLimit || config.activeLimit < 0;
  };


  self._canQueue = function() {
    return self.getLength() < config.queuedLimit || config.queuedLimit < 0;
  };


  self._checkQueue = function check() {
    if (self._canStart() && queue.length > 0) {
      const job = self._dequeueJob();
      self._startJob(job);
    }
  };


  self.log('Created with config:', config);

};
util.inherits(JobQueue, EventEmitter);


module.exports = JobQueue;
