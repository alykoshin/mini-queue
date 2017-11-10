/* globals describe, before, beforeEach, after, afterEach, it */

'use strict';

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

process.env.DEBUG = 'queue';// + (process.env.DEBUG || ''); // does not work in tests

//var JobQueue = require('../lib/job-queue');
var JobQueue = require('../');


chai.should();
//http://chaijs.com/plugins/chai-things
chai.use(require('chai-things'));

describe('job-queue', function () {


  describe('queuedLimit', function() {

    it('{ activeLimit: 1, queuedLimit: 1 }', function(testDone) {
      var queue, job1;

      queue = new JobQueue({ activeLimit: 1, queuedLimit: 1 });
      job1 = queue.createJob({});

      var job2 = queue.createJob({});
      var job3 = queue.createJob({});

      job1.on('process', function(jobDone) {
        job1.log('*** job1:process');
        // job1 becomes active immediately on next tick while job2 is still new
        expect(job2.state).equals('new');
        // run following tests on next tick to allow job2, job3 to change state from new->queue or reject
        process.nextTick(function(){
          //callback(err1, result1);
          expect(job2.state).equals('queue');
          expect(job3.state).equals('reject');

          testDone();
        });
      });
    });

  });


  describe('jobs: 0', function() {
    var queue;

    beforeEach('beforeEach', function () {
      queue = new JobQueue();
    });

    it('expect getLength() = 0', function () {
      expect(queue.getLength()).equals(0);
    });

    it('expect queue._terminateJob() to throw', function () {
      expect(queue._terminateJob).throw(Error);
    });

  });

  describe('jobs: 1', function() {
    let queue;

    beforeEach('beforeEach', function () {
      queue = new JobQueue();
    });

    it('expect after createJob() getLength() = 0 (same tick)', function () {
      const jobName   = 'testJob';
      const groupName = 'testGroup';
      const job1 = queue.createJob({}, { name: jobName, group: groupName });
      expect(queue.getLength()).equals(0);

      expect(job1.state).equals('new');
      expect(job1.name).equals(jobName);
      expect(job1.group).equals(groupName);

      expect(job1.journalEntry).is.an('object');
      expect(job1.journalEntry).to.have.a.property('id');
      expect(job1.journalEntry).to.have.a.property('new');
      expect(job1.journalEntry.id).equals(job1.id);

      expect(queue.journal).to.have.a.property(groupName);
      expect(queue.journal[groupName]).to.have.a.property(jobName);
      expect(queue.journal[groupName][jobName]).to.be.an('array');
      expect(queue.journal[groupName][jobName][0]).to.equals(job1.journalEntry);

      //expect(queue.journal).equals('new');
    });

    // no 'queue' as job becomes active on next tick
    //it('expect queue.createJob() triggers job.on(queue) for empty queue', function (done) {
    //  var job = queue.createJob();
    //  //expect(job.state).equals('queue');
    //  job.on('queue', function () {
    //    return done();
    //  });
    //});

    it('expect queue.createJob() triggers job.on(process) for empty queue', function (testDone) {
      var job1 = queue.createJob();
      expect(job1.state).equals('new');
      // no 'queue' as job becomes active on next tick
      //var callbackCount = 2;
      //job.on('queue', function () {
      //  callbackCount--;
      //  return done();
      //});
      job1.on('process', function () {
        //callbackCount--;
        //expect(callbackCount).equals(0);
        return testDone();
      });
    });

    it('expect queue.createJob() triggers queue.on(process) for empty queue with same job id', function (testDone) {
      var job1 = queue.createJob();
      queue.on('process', function (job) {
        expect(job1.id).equals(job.id);
        return testDone();
      });
    });

    it('expect queue.createJob() job.on(process) handler triggers job.on(complete) for empty queue', function (testDone) {
      var err1 = 'err', result1 = 'result';
      var job1 = queue.createJob();
      job1.on('process', function (jobDone) {
        return jobDone(err1, result1);
      });
      job1.on('complete', function (err, result) {
        expect(err).equals(err1);
        expect(result).equals(result1);
        expect(job1.journalEntry).has.a.property('complete');
        return testDone();
      });
    });

  });

  describe('jobs: 2', function() {
    var queue, job1;

    beforeEach('beforeEach', function () {
      queue = new JobQueue({ activeLimit: 1 });
      job1 = queue.createJob({});
    });

    it('expect activeCount = 0 (same tick)', function () {
      expect(queue.activeCount).equals(0);
    });

    it('expect getLength() = 0 (same tick)', function () {
      expect(queue.getLength()).equals(0);
    });

    it('expect after job2 = createJob() getLength() = 0 (same tick)', function () {
      var job2 = queue.createJob();
      expect(queue.getLength()).equals(0);
    });

    it('expect after job2 = createJob() activeCount = 0 (same tick)', function () {
      var job2 = queue.createJob();
      expect(queue.activeCount).equals(0);
    });

    it('expect job1: queue->process->complete, job2: queue->process->complete', function (testDone) {
      var err1 = 'err1', result1 = 'result1';
      var err2 = 'err2', result2 = 'result2';
      var callbackCount = 6;

      var job2 = queue.createJob();

      expect(job1.state).equals('new');
      expect(job2.state).equals('new');

      // no 'queue' as job1 becomes active on next tick
      //job1.on('queue', function() {
      //  console.log('job1:queue');
      //callbackCount--;
      //  expect(job2.state).equals('new');
      //  callbackCount++;
      //});
      job1.on('process', function(jobDone) {
        job1.log('*** job1:process');
        callbackCount--;
        // job1 becomes active immediately on next tick while job2 is still new
        expect(job2.state).equals('new');
        // job1 is active and can be found by id
        expect(queue.getJob(job1.id)).eql(job1);
        // run callback on next tick to allow job2 to change state from new->queue
        process.nextTick(function(){
          jobDone(err1, result1);
        });
      });
      job1.on('complete', function(err, result) {
        job1.log('*** job1:complete');
        callbackCount--;
        expect(job2.state).equals('queue');
        expect(job2.journalEntry).has.a.property('queue');
        // job2 is queued and can be found by id
        expect(queue.getJob(job2.id)).eql(job2);
        expect(err).equals(err1);
        expect(result).equals(result1);
      });
      job2.on('queue', function() {
        job2.log('*** job2:queue');
        expect(job1.state).equals('process');
        expect(job1.journalEntry).has.a.property('process');
        callbackCount--;
      });
      job2.on('dequeue', function() {
        job2.log('*** job2:dequeue');
        // job2 is queued and can not be found by id
        expect(queue.getJob(job2.id)).eql(null);
        expect(job1.state).equals('complete');
        expect(job1.journalEntry).has.a.property('complete');
        callbackCount--;
      });
      job2.on('process', function(jobDone) {
        job2.log('*** job2:process');
        callbackCount--;
        // job2 is active and can be found by id
        expect(queue.getJob(job2.id)).eql(job2);

        expect(job1.state).equals('complete');
        jobDone(err2, result2);
      });
      job2.on('complete', function(err, result) {
        job2.log('*** job2:complete');
        callbackCount--;
        expect(job2.state).equals('complete');
        expect(job2.journalEntry).has.a.property('complete');
        // job2 is queued and can not be found by id
        expect(queue.getJob(job2.id)).eql(null);

        expect(err).equals(err2);
        expect(result).equals(result2);
        expect(callbackCount).equals(0);
        testDone();
      });
    });

    it('expect cancelJob to emit queue,dequeue,cancel', function (testDone) {
      var job2 = queue.createJob();
      expect(job2.state).equals('new');
      expect(job2.journalEntry).has.a.property('new');
      var callbackCount = 3;

      job2.on('queue', function() {
        job2.log('*** job2:queue');
        expect(job1.state).equals('process');
        expect(job1.journalEntry).has.a.property('process');
        expect(job2.state).equals('queue');
        expect(job2.journalEntry).has.a.property('queue');
        callbackCount--;
        queue._cancelJob(job2);
      });
      job2.on('dequeue', function() {
        job2.log('*** job2:dequeue');
        expect(job1.state).equals('process');
        expect(job1.journalEntry).has.a.property('process');
        expect(job2.state).equals('dequeue');
        expect(job2.journalEntry).has.a.property('dequeue');
        callbackCount--;
      });
      job2.on('cancel', function() {
        job2.log('*** job2:cancel');
        expect(job1.state).equals('process');
        expect(job1.journalEntry).has.a.property('process');
        expect(job2.state).equals('cancel');
        expect(job2.journalEntry).has.a.property('cancel');
        expect(queue.journal['default']['default'].length = 2);
        callbackCount--;
        expect(callbackCount).equals(0);
        testDone();
      });
    });


  });


});
