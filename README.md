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
          |         +---v----+---+               +-V----------+
          |         | dequeue    +---------------> cancel     |
          |         |            | _cancelJob    |            |
          |         +-----+------+               +------------+
          |     _startJob | 
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

`job.journalEntry` for each state (`queue`, `dequeue`, `process`, `complete`, `reject`, `cancel`) stores the time when transition to state occured. If several changes has occured, only the last time is stored(`id` is job identifier `job.id`):   

```json
       { id: 4,
          new: 2017-11-10T08:37:17.428Z,
          queue: 2017-11-10T08:37:17.428Z,
          dequeue: 2017-11-10T08:37:17.941Z,
          process: 2017-11-10T08:37:17.941Z,
          complete: 2017-11-10T08:37:18.943Z },

```

For each `group` and `name` as provided in `option` for `createJob()`, `journalEntries` are kept ar array in `queue.journal` (newest is the first, oldest is the last).

Example (`group` and `name` not set, `default` value is used):

```json
journal: { group: 
   { name: 
      [ { id: 5,
          new: 2017-11-10T08:37:17.929Z,
          reject: 2017-11-10T08:37:17.929Z },
. . .
        { id: 2,
          new: 2017-11-10T08:37:16.426Z,
          queue: 2017-11-10T08:37:16.427Z,
          dequeue: 2017-11-10T08:37:16.937Z,
          process: 2017-11-10T08:37:16.937Z,
          complete: 2017-11-10T08:37:17.941Z } ] } } +2s

``` 

Up to `maxJournalLength` option for `createJob()` records are kept.


## Example

You may find this example in `demo` subdirectory of the package.

```js
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
      }, 1500); 
  }
}, 500);


// execute jobs

queue.on('process', function(job, jobDone) {
  debug(`queue.on('process'): [${job.id}]: status: ${job.status}, journalEntry: ${JSON.stringify(job.journalEntry)}`);
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
  debug(`queue.on('reject'): [${job.id}]: status: ${job.status}, journalEntry: ${JSON.stringify(job.journalEntry)}`);
});
```

## Credits
[Alexander](https://github.com/alykoshin/)


# Links to package pages:

[github.com](https://github.com/alykoshin/mini-queue) &nbsp; [npmjs.com](https://www.npmjs.com/package/mini-queue) &nbsp; [travis-ci.org](https://travis-ci.org/alykoshin/mini-queue) &nbsp; [coveralls.io](https://coveralls.io/github/alykoshin/mini-queue) &nbsp; [inch-ci.org](https://inch-ci.org/github/alykoshin/mini-queue)


## License

MIT
