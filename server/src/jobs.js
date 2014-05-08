// jobs
// inspired by https://github.com/flatiron/neuron ( (C) 2010 Charlie Robbins, MIT license)
//
'use strict';

var util = require('util'),
    events = require('events'),
    async = require('async');

var neuron = exports;

//
// ### function JobManager (options)
// #### @options {Object} Settings to use for this instance
// Constructor function for the JobManager object which manages a set of workers
// for a single instance of neuron.Job.
//
var JobManager = function (options) {
  options = options || {};
  
  var self = this;
  this.concurrency = options.concurrency || 50;
  this.emitErrs = options.emitErrs || false;
  this.jobs = {};
  
  if (options.cache) {
    this.cache = new neuron.WorkerCache(options.cache);
  }
  
  if (options.jobs) {
    Object.keys(options.jobs).forEach(function (name) {
      self.addJob(name, options.jobs[name]);
    });
  }
};

// Inherit from events.EventEmitter
util.inherits(JobManager, events.EventEmitter);

//
// ### funtion addJob (name, props)
// #### @name {string} Name of the job to add to this instance.
// #### @props {Object} Properties to use for this job.
// Sets the job for this instance to manage.
//
JobManager.prototype.addJob = function (name, props, cached) {
  if (this.jobs[name]) throw new Error('Job with name `' + name + '` already exists.');
  else if (!props) throw new Error('Cannot addJob with no attributes.');
  
  var self = this;
  props.concurrency = props.concurrency || this.concurrency;
  this.jobs[name] = new neuron.Job(name, props);
  
  this.jobs[name].on('start', function (worker) {
    self.emit('start', self.jobs[name], worker);
  });

  // Re-emit the finish event for each Job managed by this instance.
  this.jobs[name].on('finish', function (worker) {
    self.emit('finish', self.jobs[name], worker);
    
    // If a cache is used by this instance, remove this worker from it
    if (self.cache) {
      self.cache.remove(name, worker.id, function (err) {
        if (err && self.emitErrs) {
          self.emit('error', err);
        }
      });
    }
  });
  
  // Re-emit the empty event for each Job managed by this instance.
  this.jobs[name].on('empty', function () {
    self.emit('empty', self.jobs[name]);
  });
};

//
// ### function enqueue (name, /* variable arguments */)
// #### @name {string} Name of the job to start.
// #### @arguments {variable} The arguments to pass to the running job.
// Creates a new Worker instance for the Job managed by this instance with `name`
// by creating calling job.enqueue() with the specified `@arguments`. 
//
JobManager.prototype.enqueue = function (name) {
  if (Object.keys(this.jobs).length === 0) throw new Error('Cannot call start() with no job to perform.');
  else if (!this.jobs[name]) throw new Error('Cannot find job with name `' + name + '`.');
  
  var self = this,
      args = Array.prototype.slice.call(arguments, 1),
      job = this.jobs[name],
      worker = job.enqueue.apply(job, [this.jobs[name].getId()].concat(args));
  
  // If a cache is used by this instance, add this worker to it
  if (this.cache) {
    this.cache.add(name, worker.id, args, function (err) {
      if (err && self.emitErrs) {
        self.emit('error', err);
      }
    });
  }    
  
  return worker.id;
};

//
// ### function removeJob (name) 
// #### @name {string} Name of the job to remove
// Removes the job with the specified `name` from this instance,
// if any workers for this job are already running, then they will 
// complete. However, any additional queued workers will be stopped
//
JobManager.prototype.removeJob = function (name) {
  if (Object.keys(this.jobs).length === 0) throw new Error('Cannot call removeWorker() with no jobs to perform.');
  else if (!this.jobs[name]) throw new Error('Cannot find job with name `' + name + '`.');
  
  this.jobs[name].queue = [];
  this.jobs[name].waiting = {};
  delete this.jobs[name];
  
  // If a cache is used by this instance, remove all workers from it
  if (this.cache) {
    this.cache.removeAll(name, function (err) {
      if (err && self.emitErrs) {
        self.emit('error', err);
      }
    });
  }
  
  return true;
};

//
// ### function removeWorker (name, workerId)
// #### @name {string} Name of the job to remove the worker from.
// #### @workId {string} The ID of the worker to remove.
// Attempts to remove the worker with the specified `workerId` from the job
// managed by this instance with the specified `name`.
//
JobManager.prototype.removeWorker = function (name, workerId) {
  if (Object.keys(this.jobs).length === 0) throw new Error('Cannot call removeWorker() with no jobs to perform.');
  else if (!this.jobs[name]) throw new Error('Cannot find job with name `' + name + '`.');
  
  var result = this.jobs[name].removeWorker(workerId);
  
  // If a cache is used by this instance, remove this worker from it
  if (this.cache) {
    this.cache.remove(name, worker.id, function (err) {
      if (err && self.emitErrs) {
        self.emit('error', err);
      }
    });
  }
  
  return result;
};

//
// ### function getWorker (name, workerId)
// #### @name {string} Name of the job to get the worker for.
// #### @workerId {string} The id of the worker to retreive.
// Gets a worker with the specified `workerId` for the job
// with the specified `name` named by this instance.
//
JobManager.prototype.getWorker = function (name, workerId) {
  if (!this.jobs[name]) throw new Error ('Cannot get worker for unknown job `' + name + '`');
  return this.jobs[name].getWorker(workerId);
};

//
// ### function getPosition (name, workerId) 
// #### @name {string} Name of the job to get the worker for.
// #### @workerId {string} The id of the worker to retreive.
// Gets the position of the worker with the specified `workerId`
// in the queue for the job with `name`.
//
JobManager.prototype.getPosition = function (name, workerId) {
  if (!this.jobs[name]) throw new Error ('Cannot get worker position for unknown job `' + name + '`');
  return this.jobs[name].getPosition(workerId);
};

//
// ### function use (options)
// #### @options {Object} Options for the new WorkerCache
// Creates a new WorkerCache for this instance with the specified `options`.
//
JobManager.prototype.use = function (options) {
  this.cache = new WorkerCache(options);
};

//
// ### function load () 
// Loads worker data for this instance from the associated WorkerCache.
//
JobManager.prototype.load = function () {
  var self = this;
  
  this.cache.connect();
  this.cache.load(function (err, workers) {
    if (err && self.emitErrs) {
      self.emit('error', err);
    }
    
    Object.keys(workers).forEach(function (name) {
      workers[name].forEach(function (worker) {
        if (self.jobs[name]) {
          var job = self.jobs[name];
          job.enqueue.apply(job, [worker.id].concat(worker));
        }
      });
    });
    
    self.emit('load');
  });
};

neuron.JobManager  = JobManager;

//
// ### function Job (jobName, props)
// #### @jobName {string} The name to associate with this job (e.g. `directoryLister`)
// #### @props {Object} Properties to pass along to each worker instance created from this instance
// Constructor function for the Job object. Represents a specific task to be done repeatedly with
// possible default values and other metadata.
//
var Job = function (name, props) {
  if (!props.work) throw new Error('Worker function `work()` is required.');
  else if (props['finished']) throw new Error('`finished` is a reserved property.');
  
  events.EventEmitter.call(this);
  
  this.name = name;
  this.running = {};
  this.waiting = {};
  this.queue = [];
  this.concurrency = props.concurrency || 50;
  
  var self = this;
  Object.keys(props).forEach(function (property) {
    self[property] = props[property];
  });
};

util.inherits(Job, events.EventEmitter);

//
// ### function enqueue (id, /* variable arguments */)
// #### @id {string} Id of the worker to enqueue.
// #### @arguments {variable} The arguments to pass to the running job.
// Creates a new Worker instance for this instance which takes `@arguments`. 
// If the number of keys in  `this.running` exceeds `this.concurrency` the job is appended 
// to the `waiting` set and added to the `queue` managed by this instance.
//
Job.prototype.enqueue = function (id) {
  if (this.running[id] || this.waiting[id]) {
    throw new Error('Worker with id `' + id + '` already exists');
  }

  var self = this, worker = new neuron.Worker(id, this, Array.prototype.slice.call(arguments, 1));
  
  worker.on('start', function () {
    self.emit('start', self, worker);
  });
  
  worker.once('finish', function () {
    self._workComplete(worker);
  });
  
  if (Object.keys(this.running).length >= this.concurrency) {
    this.waiting[id] = worker;
    this.queue.push(id);
  }
  else {
    this.running[id] = worker;
    process.nextTick(function () {
      worker.run();
    });
  }
  
  return worker;
};

//
// ### function removeWorker (workerId)
// #### @workerId {string} Id of the worker to remove
// Removes the worker with the specified `workerId` from this 
// instance. If the worker is already running it cannot be removed,
// and this method will return `false`.
//
Job.prototype.removeWorker = function (workerId) {
  if (this.running[workerId]) {
    return false;
  }
  else if (this.waiting[workerId]) {
    this.queue.splice(this.queue.indexOf(workerId), 1);
    delete this.waiting[workerId];
    return true;
  }
  
  return null;
};

//
// ### function JobManager.prototype.getWorker (workerId)
// #### @workerId {string} The id of the worker to retreive.
// Gets a worker with the specified id
//
Job.prototype.getWorker = function (workerId) {
  if (this.running[workerId]) {
    return this.running[workerId];
  }
  else if (this.waiting[workerId]) {
    return this.waiting[workerId];
  }
  
  return null;
};

//
// ### function getPosition (workerId)
// #### @workerId {string} The id of the worker to retreive.
// Gets the queue position of the worker with the specified id.
//
Job.prototype.getPosition = function (workerId) {
  return this.queue.indexOf(workerId);
};

//
// ### function getId ()
// Gets a unique id for a new worker associated with this instance.
//
Job.prototype.getId = function () {
  var workerId = neuron.randomString(32);
  while (this.running[workerId] || this.waiting[workerId]) {
    workerId = neuron.randomString(32);
  }
  
  return workerId;
};

//
// ### function _workComplete (worker)
// #### @worker {Worker} The worker who has just completed.
// Updates bookkeeping associated with this instance
// knowing that the given worker is now complete.
//
Job.prototype._workComplete = function (worker) {
  var self = this, nextWorker, nextId;
  
  delete this.running[worker.id];
  self.emit('finish', worker);
  
  // If the queue is now empty, notify the user
  if (self.queue.length === 0) {
    self.emit('empty');
  }

  this._replenish();
};

//
// ### function _replenish ()
// Replenishes the running worker by dequeuing waiting workers from `this.queue`.
//
Job.prototype._replenish = function () {
  var self = this, running = Object.keys(this.running).length,
      workerId, started = [];
  
  if (this.queue.length === 0) return false;
  else if (running > this.concurrency) return false;
  
  while (running < this.concurrency && (workerId = this.queue.shift())) {
    //
    // Close over the workerId and the worker annoymously so we can
    // user `process.nextTick()` effectively without leakage.
    //
    (function (id, w) {
      started.push(id);
      //
      // Move the worker from the set of waiting workers to the set
      // of running workers
      //
      delete self.waiting[id];
      self.running[id] = w;
      
      //
      // Increment the length of the running workers manually
      // so we don't have to call `Object.keys(this.running)` again
      //
      running += 1;

      // Start the worker on the next tick.
      process.nextTick(function () {
        w.run();
      });
    })(workerId, this.waiting[workerId]);
  }
  
  return started;
};

neuron.Job  = Job;

//
// ### function WorkerCache (options)
// #### @options {Object} Options to use for this instance.
// Constructor function for the WorkerCache object. Caches worker 
// information in a remote Redis server. 
//
var WorkerCache = function (options) {
  options = typeof options === 'object' ? options : {};
  
  this.namespace = options.namespace || 'neuron';
  this.db = options.db;
};


//
// ### function load (callback)
// #### @callback {function} Continuation to pass control to when complete.
// Loads all data from the remove Redis server for this instance.
//
WorkerCache.prototype.load = function (callback) {
  var self = this, jobs = {}, workers = {};
  
  function getWorker (name, next) {
    self.db.getWorker(self.key('workers', name), function (err,ids){
    //self.redis.smembers(self.key('workers', name), function (err, ids) {
      function getWorker (id, next) {
        self.db.getWorker(self.key('workers', name, id), function (err,worker){
        //self.redis.get(self.key('workers', name, id), function (err, worker) {
          if (err) {
            return next(err);
          }
          
          if (!workers[name]) {
            workers[name] = [];
          }
          
          //var result = JSON.parse(worker);
          var result = worker;
          result.id = id;
          workers[name].push(result);
          next();
        });
      }
      
      async.forEachSeries(ids, getWorker, function (err) {
        return err ? next(err) : next();
      });
    });
  }
  db.getWorker(this.key('jobs'), function (err, names) {
  //this.redis.smembers(this.key('jobs'), function (err, names) {
    self.async.forEach(names, getWorkers, function (err) {
      if (callback) {
        return err ? callback(err) : callback(null, workers);
      }
    });  
  });  
};

//
// ### function add (name, workerId, args, callback)
// #### @name {string} Name of the job to add the worker to
// #### @workerId {string} Id of worker to add
// #### @args {Array} Arguments for the worker to add
// #### @callback {function} Continuation to pass control to when complete.
// Adds a new worker with `workerId` and `args to the job with the specified `name`.
//
WorkerCache.prototype.add = function (name, workerId, args, callback) {
  var self = this;
  self.db.addWorkerId(this.key('jobs'), name, function (err) {
  //this.redis.sadd(this.key('jobs'), name, function (err) {
    if (err) {
      return callback(err);
    }
    self.db.addWorkerId(self.key('workers', name), workerId, function (err) {
    //self.redis.sadd(self.key('workers', name), workerId, function (err) {
      if (err) {
        return callback(err);
      }
      self.db.setWorker(self.key('workers', name, workerId), args, function (err) {
      //self.redis.set(self.key('workers', name, workerId), JSON.stringify(args), function (err) {
        if (callback) {
          callback(err);
        }
      });
    });
  });
};

//
// ### function get (name, workerId, callback)
// #### @name {string} Name of the job to get the worker for
// #### @workerId {string} Id of worker to get
// #### @callback {function} Continuation to pass control to when complete.
// Gets the worker for the job with the specified `name` with `workerId`.
//
WorkerCache.prototype.get = function (name, workerId, callback) {
  var self=this;
  self.db.getWorker(this.key('workers', name, workerId), function (err, worker) {
  //this.redis.get(this.key('workers', name, workerId), function (err, worker) {
    if (callback) {
      //var result = worker ? JSON.parse(worker) : worker;
      var result = worker;
      return err ? callback(err) : callback(null, result);
    }
  });
};

//
// ### function remove (name, workerId, callback)
// #### @name {string} Name of the job to remove the worker from
// #### @workerId {string} Id of worker to remove
// #### @callback {function} Continuation to pass control to when complete.
// Removes the worker with the specified `workerId` from this instance 
// for the job with the specified `name`.
//
WorkerCache.prototype.remove = function (name, workerId, callback) {
  var self = this;
  self.db.removeWorkerId(this.key('workers', name), workerId, function (err) {
  //self.redis.srem(this.key('workers', name), workerId, function (err) {
    if (err) {
      return callback(err);
    }
    self.db.removeWorker(self.key('workers', name, workerId), function (err) {
    //self.redis.del(self.key('workers', name, workerId), function (err) {
      if (callback) {
        callback(err);
      }
    });
  });
};

//
// ### function removeAll (name, callback)
// #### @name {string} Name of the job to remove all workers for
// #### @callback {function} Continuation to pass control to when complete.
// Removes all workers from this instance for the job with the specified `name`.
//
WorkerCache.prototype.removeAll = function (name, callback) {
  var self = this;
  self.db.getWorker(this.key('workers', name), function (err, ids) {
  //this.redis.smembers(this.key('workers', name), function (err, ids) {
    if (err) {
      return callback(err);
    }
    
    function remove (id, next) {
      self.remove(name, id, next);
    }
    
    async.forEach(ids, remove, function (err) {
      if (callback) {
        return err ? callback(err) : callback(null);
      }
    });
  });
};

//
// ### function key (arguments)
// Returns the cache key for the specified `arguments`.
//
WorkerCache.prototype.key = function () {
  var args = Array.prototype.slice.call(arguments);
  
  args.unshift(this.namespace);
  return args.join(':');
};

neuron.WorkerCache  = WorkerCache;

//
// ### function Worker (workerId, job, args)
// #### @workerId {string} The id of this worker
// #### @job {Job} The job that this worker should run
// #### @args {Array} The arguments to pass to the `job.work()` function
// Constructor function for the Worker object which runs the specified arguments
// on the work() function of the given instance of neuron.Job.
//
var Worker = function (workerId, job, args) {
  if (!workerId) throw new Error('workerId is required.');
  else if (!(job instanceof neuron.Job)) throw new Error('job must be an instanceof neuron.Job');
  
  this.id = workerId;
  this.job = job;
  this.args = args;
  
  this._finished = false;
  this.running = false;
};

// Inherity from events.EventEmitter
util.inherits(Worker, events.EventEmitter);

//
// ### function start (/* variable arguments */)
// @arguments {Array} Arguments to pass to the `work()` function
// Starts the `work()` function for the Job associated with this instance.
//
Worker.prototype.run = function () {
  this.running = true;
  this.emit('start');
  this.job.work.apply(this, this.args);
};

//
// ### get finished()
// Returns a value indicating whether this instance is finished or not
//
Worker.prototype.__defineGetter__('finished', function () {
  return this._finished;
});

//
// ### set finished (value)
// @value {boolean} A value indicating whether this instance is finished or not.
//
Worker.prototype.__defineSetter__('finished', function (value) {
  this._finished = value;
  if (value === true) {
    this.running = false;
    this.emit('finish');
  }
});

neuron.Worker = Worker;

neuron.version = [0, 4, 0];

//
// ### function randomString (bits)
// #### @bits {int} Number of bits for the random string to have (base64)
// randomString returns a pseude-random ASCII string which contains at least the specified number of bits of entropy
// the return value is a string of length ⌈bits/6⌉ of characters from the base64 alphabet
//
neuron.randomString = function (bits) {
  var chars, rand, i, ret;
  chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  ret = '';
  
  //
  // in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
  //
  while (bits > 0) {
    rand = Math.floor(Math.random()*0x100000000) // 32-bit integer
    // base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
    for (i=26; i>0 && bits>0; i-=6, bits-=6) { 
      ret+=chars[0x3F & rand >>> i];
    }
  }
  return ret;
};

