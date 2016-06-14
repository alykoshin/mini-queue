[![npm version](https://badge.fury.io/js/mini-queue.svg)](http://badge.fury.io/js/mini-queue)
[![Build Status](https://travis-ci.org/alykoshin/mini-queue.svg)](https://travis-ci.org/alykoshin/mini-queue)
[![Coverage Status](https://coveralls.io/repos/alykoshin/mini-queue/badge.svg?branch=master&service=github)](https://coveralls.io/github/alykoshin/mini-queue?branch=master)
[![Code Climate](https://codeclimate.com/github/alykoshin/mini-queue/badges/gpa.svg)](https://codeclimate.com/github/alykoshin/mini-queue)
[![Inch CI](https://inch-ci.org/github/alykoshin/mini-queue.svg?branch=master)](https://inch-ci.org/github/alykoshin/mini-queue)

[![Dependency Status](https://david-dm.org/alykoshin/mini-queue/status.svg)](https://david-dm.org/alykoshin/mini-queue#info=dependencies)
[![devDependency Status](https://david-dm.org/alykoshin/mini-queue/dev-status.svg)](https://david-dm.org/alykoshin/mini-queue#info=devDependencies)


# mini-queue

Job queue


If you have different needs regarding the functionality, please add a [feature request](https://github.com/alykoshin/mini-queue/issues).


## Installation

```sh
npm install --save mini-queue
```

## Usage

```
 QueueJob State Diagram (methods of JobQueue object)
 ======================

             |
   createJob |
      +------V-----+
      | new        |
      |            |
      +---+--+--+--+
          |  |  | _rejectJob                     +------------+
          |  |  +--------------------------------> reject     |
          |  |                                   |            |
_startJob |  | _queueJob                         +------------+
          |  +------------+
          |               |
          |         +-----v------+ _cancelJob
          |         | queue      +-----------------+
          |         |            |                 |
          |         +---+----^---+                 |
          | _dequeueJob |    |                     |
          |             |    |                     |
          |             |    | _queueJob           |
          |         +---v----+---+   _cancelJob  +-V----------+
          |         | dequeue    +---------------> cancel     |
          |         |            |               |            |
          |         +-----+------+               +------------+
          |               | _startJob
          |               |
          |    +----------+
          |    |
      +---v----v---+  _terminateJob       +------------+
      | process    +----------------------> terminate  |
      |            |                      |(not implem)|
      +-----+------+                      +------------+
            |
            |
            |
      +-----v------+
      | complete   |
      |            |
      +------------+

```

## Example

You may find this example in `demo` subdirectory of the package.

```js
"use strict";

process.env.DEBUG = 'queue,app';// + (process.env.DEBUG || '');
var debug   = require('debug')('app');


var Queue = require('express-queue');
//var Queue = require('../');
var queue = new Queue({ activeLimit: 1, queuedLimit: 1 });

// create jobs
var maxCount = 5,
    count = 0;

var interval = setInterval(function() {        
  var jobData = {};
  // Create new job for the queue
  // If number of active job is less than `activeLimit`, the job will be started on Node's next tick.
  // Otherwise it will be queued.
  queue.createJob(jobData); // we may pass some data to job when calling queue.createJob() function
  if (++count >= maxCount) {
    clearInterval(interval);
  }
}, 500);


// execute jobs

queue.on('process', function(job, jobDone) {
  debug('queue.on(\'process\'): ['+job.id+']');
  // Here the job starts
  // Imitate job processing which takes 1 second to be finished
  // job.data is set to value passed to queue.createJob()
  setTimeout(function() {
    // Call the callback to signal to the queue that the job has finished
    // and the next one may be started
    jobDone();
    // Now on Node's next tick the next job (if any) will be started
  }, 1000);
});

// Signal about jobs rejected due to queueLimit

queue.on('reject', function(job) {
  debug('queue.on(\'reject\'): ['+job.id+']');
});
```

## Credits
[Alexander](https://github.com/alykoshin/)


# Links to package pages:

[github.com](https://github.com/alykoshin/mini-queue) &nbsp; [npmjs.com](https://www.npmjs.com/package/mini-queue) &nbsp; [travis-ci.org](https://travis-ci.org/alykoshin/mini-queue) &nbsp; [coveralls.io](https://coveralls.io/github/alykoshin/mini-queue) &nbsp; [inch-ci.org](https://inch-ci.org/github/alykoshin/mini-queue)


## License

MIT
