/**
 * Created by alykoshin on 03.02.16.
 */

'use strict';

const EventEmitter = require('events');
const util = require('util');
const debug = require('debug')('queue');

const Job = require('./job');

const MAX_JOURNAL_LENGTH = 100;

/*
 * For state diagram please refer to README.md
 */


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
    let s = util.format('(%d/%d %d/%d %d) ', self.activeCount, config.activeLimit, self.getLength(), config.queuedLimit, self.totalCount);
    args.unshift(s);
    debug(...args);
  };

  debug(`
 +---------- active
 | +-------- activeLimit
 | | +------ queue
 | | | +---- queueLimit
 | | | | +-- total
 | | | | |
 V V V V V`);
  self.log('Queue.Queue() with config:', config);


  self._getJobFromArray = function(array, jobId) {
    return array.find((job) => (job.id === jobId));
  };


 self._getJobQueue = function(jobId) {
    return queue.find((job) => (job.id === jobId));
  };


  // get active or queued job by id
  // jobs at some states (dequeued, rejected etc) can not be found by this method
  self.getJob = function(jobId) {
    // Look inside active jobs
    // look inside queued jobs
    return self._getJobFromArray(active, jobId) || self._getJobFromArray(queue, jobId) || null;
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

    const job =  new Job(self._generateId(), self, data, options);
    job.log('Queue.createJob()');

    self.journal[options.group][options.name].unshift(job.journalEntry);
    self.journal[options.group][options.name].splice(config.maxJournalLength );//Clip journal length

    // All processing to be handled on nextTick to allow to set listeners after creation
    process.nextTick(function() {
      if (!self._canQueue()) return self._rejectJob(job);

      if (self._canStart() && queue.length === 0) return self._startJob(job);
      else return self._queueJob(job);
    });

    process.nextTick(self._checkQueue);
    return job;
  };


  self._queueJob = function(job) {
    job.log('Queue._queueJob()');

    queue.push(job);

    job._toState('queue', function(...args /* err, result */) {
      return self._onJobCancel(job, ...args /* err, result */);
    });

    return job;
  };

  /**
   *
   * @param {Job} [job] - Job to dequeue (first if empty)
   * @returns {Job}
   * @private
   */
  self._dequeueJob = function(job) {

    if (job) {
      let i = queue.indexOf(job);
      if (i < 0) {
        self.log('Queue._dequeueJob(): job [%d] not found', job.id);
      } else {
        queue.splice(i, 1);
        job.log('Queue._dequeueJob(): index: %d', i);
      }
    } else {
      job = queue.shift();
    }

    job.log('Queue._dequeueJob()');
    job._toState('dequeue');

    return job;
  };


  self._startJob = function(job) {
    job.log('Queue._startJob()');

    self.activeCount++;
    active.push(job); // store to array of active jobs

    job._toState('process', function(...args /*err, result*/) {
      self._onJobComplete(job, ...args /*err, result*/);
    });

    return job;
  };


  self._onJobComplete = function(job, ...args /*err, result*/) {
    job.log('Queue._onJobComplete()');

    let i = active.indexOf(job);
    if (i < 0) {
      self.log('Queue._onJobComplete(): job [%d] not found', job.id);
    } else {
      job.log('Queue._onJobComplete(): index: %d', i);
      active.splice(i, 1);
      self.activeCount--;
    }

    job._toState('complete', ...args /*err, result*/);

    process.nextTick(self._checkQueue);
  };


  self._terminateJob = function(/*job*/) {
    throw new Error('Not implemented');
  };


  self._onJobCancel = function(job) {
    job.log('Queue._onJobCancel()');
    return self._cancelJob(job);
  };


  /**
   * Reject job (job is new)
   *
   * @param job
   * @private
   */
  self._rejectJob = function(job) {
    job.log('Queue._rejectJob()');
    job._toState('reject');
    return job;
  };


  /**
   * Cancel job (job is in queue)
   *
   * @param job
   * @private
   */
  self._cancelJob = function(job) {
    job.log('Queue._cancelJob()');
    self._dequeueJob(job);
    job._toState('cancel');
    return job;
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


};
util.inherits(JobQueue, EventEmitter);


module.exports = JobQueue;
