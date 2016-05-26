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

## Credits
[Alexander](https://github.com/alykoshin/)


# Links to package pages:

[github.com](https://github.com/alykoshin/mini-queue) &nbsp; [npmjs.com](https://www.npmjs.com/package/mini-queue) &nbsp; [travis-ci.org](https://travis-ci.org/alykoshin/mini-queue) &nbsp; [coveralls.io](https://coveralls.io/github/alykoshin/mini-queue) &nbsp; [inch-ci.org](https://inch-ci.org/github/alykoshin/mini-queue)


## License

MIT
