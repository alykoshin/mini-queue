/**
 * Created by alykoshin on 27.05.16.
 */

"use strict";

process.env.DEBUG = 'queue,app';// + (process.env.DEBUG || '');
var debug   = require('debug')('app');


//var queue = require('express-queue');
var Queue = require('../');
var queue = new Queue({ activeLimit: 1, queuedLimit: 1 });

// create jobs
var maxCount = 5,
    count = 0;

var interval = setInterval(function() {
  queue.createJob({});
  if (++count >= maxCount) {
    clearInterval(interval);
  }
}, 500);


// execute jobs

queue.on('process', function(job, jobDone) {
  debug('reject: ['+job.id+']');
  setTimeout(function() {
    jobDone();
  }, 1000);
});

queue.on('reject', function(job) {
  debug('reject: ['+job.id+']');
});
