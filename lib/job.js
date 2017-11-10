'use strict';

const EventEmitter = require('events');
const util = require('util');
const debug = require('debug')('queue');


class Job extends EventEmitter {


  constructor(id, queue, data, options) {
    super();
    options = options || {};

    this.id           = id;
    this.queue        = queue;
    this.data         = data;
    this.options      = options;
    this.name         = options.name;
    this.group        = options.group;
    this.journalEntry = {
      id: id,
    };
    this._toState('new');
  }


  log(...args) {
    let s = args.shift() || '';
    s = util.format('[%d] %s', this.id, s);
    args.unshift(s);
    this.queue.log(...args);
  }


  _toState(state, ...args) {
    this.log(`job.toState(): '${this.state}'=>'${state}'`);

    this.state = state;
    this.status = state; // backward compatibility

    this.journalEntry[state] = new Date();

    this.emit(state, ...args);
    this.queue.emit(state, this, ...args);

    return this;
  }


}


module.exports = Job;
