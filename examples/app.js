/**
 * Created by alykoshin on 27.05.16.
 */

"use strict";

process.env.DEBUG = 'queue,app';// + (process.env.DEBUG || '');
var util   = require('util');
var debug  = require('debug')('app');


//var Queue = require('express-queue');
var Queue = require('../');
var queue = new Queue({ activeLimit: 1, queuedLimit: 1, maxJournalLength: 4 });

// create jobs
var maxCount = 5,
    count = 0;

var interval = setInterval(function() {
  var jobData = {};
  // Create new job for the queue
  // If number of active job is less than `activeLimit`, the job will be started on Node's next tick.
  // Otherwise it will be queued.
  var job = queue.createJob(
    jobData, // we may pass some data to job when calling queue.createJob() function
    { group: 'group', name: 'name' } // group/name to be used for journal
  );

  if (++count >= maxCount) {
    clearInterval(interval);

    setTimeout(()=> { // after last job has finished
      debug('journal:', util.inspect(queue.journal, {depth:3}));
      }, 1000+500+100);
  }
}, 500);


// execute jobs

queue.on('process', function(job, jobDone) {
  debug(`queue.on('process'): [${job.id}]: state: ${job.state}, journalEntry: ${JSON.stringify(job.journalEntry)}`);
  // Here the job starts
  //
  // It is also possible to do the processing inside job.on('process'), just be careful
  // to call jobDone() callback once and only once.
  //
  // Value of job.data is set to value passed to queue.createJob()
  //
  // Imitate job processing which takes 1 second to be finished
  setTimeout(function() {
    // Call the callback to signal to the queue that the job has finished
    // and the next one may be started
    jobDone();
    // Now on Node's next tick the next job (if any) will be started
  }, 1000);
});

// Signal about jobs rejected due to queueLimit

queue.on('reject', function(job) {
  debug(`queue.on('reject'): [${job.id}]: state: ${job.state}, journalEntry: ${JSON.stringify(job.journalEntry)}`);
});
