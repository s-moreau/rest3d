/**
 * in memory session management 
 * adapted from:
 *
 * @class node_modules.restify_session
 * 
 * @author Marcello Gesmundo
 * 
 * This module manage session for a restify server without cookies. It uses Redis (>=2.0.0) as fast session store.
 * Derived from redis-session.
 * 
 * # Example
 * 
 *      var restify = require('restify'),
 *          session = require('restify-session')({
 *              debug : true,
 *              ttl   : 2
 *          });
 *      var server  = restify.createServer();
 *
 *      // attach session manager
 *      server.use(session.sessionManager)
 *
 *      // attach a route
 *      server.get('/', function(req, res, next){
 *         res.send({ success: true, session: req.session });
 *         return next();
 *      });
 *
 *      // start the server
 *      server.listen(3000);
 *
 *      // Save this file as server.js and start it in a terminal window:
 *
 *      $ node server.js
 *
 *      // Open your browser and put the address of your server:
 *
 *      http://localhost:3000
 *
 *      // Now you see an answer like this:
 *
 *      {"success":true,"session":{"sid":"ViS5pHE5n8McblTATbyFUJTGJyzVFeXOcAEZ41Zs"}}
 *
 *      // You can see your session id (sid) into the response header:
 *
 *      Session-Id ViS5pHE5n8McblTATbyFUJTGJyzVFeXOcAEZ41Zs
 *
 * For more information see test/test.js into package folder.
 * 
 *  
 * 
 * # License
 * 
 * Copyright (c) 2012 Mitchell Simoens (https://github.com/mitchellsimoens/redis-session)
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 * 
 *    * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above
 *      copyright notice, this list of conditions and the following
 *      disclaimer in the documentation and/or other materials provided
 *      with the distribution.
 *    * Neither the name of Yoovant nor the names of its
 *      contributors may be used to endorse or promote products derived
 *      from this software without specific prior written permission.
 *      
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 'use strict';
module.exports = function(config) {
  // namespace
  var session = {};
  var utils   = require('object_utils');
  var Random  = require('secure-rnd');
  var rnd     = new Random();
  var Cookies = require('cookies');
  var fs      = require('fs');
  var toJSON  = require('./tojson');

  // where we store active sessions
  session.sessions = {};
  session.timeouts = {};

  /**
   * @ignore
   * @private
   */
  session.name = 'rest3d';

  /**
   * @ignore
   * @private
   */
  session.merge = utils.merge;

  config = config || {};
  /**
   * Configuration
   */
  session.config = {
    /**
     * @cfg {Integer} ttl=600 The time to live for the session in seconds
     */
    ttl: 600, // 10min
    /**
     * @cfg {Boolean} debug=true true to enable debug session
     */
    debug: false,
    /**
     * @cfg {Object} logger=console The logger. If you use winston set your desired log level and set debug = true.
     */
    logger: console,
    /**
     * @cfg {Integer} sidLength=40 The number of characters to create the session ID.
     */
    sidLength: 40,
    /**
     * @cfg {Boolean} persist=false Persistence of session
     * If persist is false, the session will expire after the ttl config.
     * If persist is true, the session will never expire and ttl config will be ignored.
     */
    persist: false,

    /**
     * @cfg {String} sidHeader='Session-Id' The Header section name to store the session identifier
     */
    sidHeader: 'x-session-id',

    /**
     * @cfg {Boolean} cookies=true Store the session in a cookie
     */
    cookies: true,

    /**
     * @cfg {Boolean} db = database driver oject, or null if no database is connected
     */
    db: null
  };

  // merge new config with default config
  session.merge(session.config, config);

  if ('function' !== typeof session.config.logger.debug) {
    session.config.logger.debug = session.config.logger.log;
  }
  if ('function' !== typeof session.config.logger.error) {
    session.config.logger.error = session.config.logger.log;
  }
  if ('function' !== typeof session.config.logger.info) {
    session.config.logger.info = session.config.logger.log;
  }

  var cfg = session.config;

  var isNull = utils.isNull;

  /**
   * Create session identifier
   *
   * @param {Function} callback Function called when the identifier is created
   * @return {callback(err, sid)} The callback to execute as result
   * @param {String} callback.err Error if occurred
   * @param {String} callback.sid session identifier
   * @private
   */
  var createSid = function(callback) {
    var chars  = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz',
        codes  = [],
        cLen   = chars.length,
        len    = cfg.sidLength,
        sid    = '',
        i      = 0,
        rNum;

    codes.length = cLen;

    // generate secure randoms
    rnd(codes);

    for ( i = 0; i < len; i++) {
      rNum = Math.floor(codes[i] * cLen / 255);
      sid += chars.substring(rNum, rNum + 1);
    }

    if (cfg.db) {
      cfg.db.getKey('cookies',sid, function (err,res){
        if (err) {
          console.log('Error getKey ');
          console.log(err);
          return callback.call(session, undefined, sid);
        } else {
          console.log('getKey returned ')
          console.log(res)
          createSid(callback);
        }
      })
    } else {
      if (session.sessions[sid] != undefined) {
          createSid(callback);
      } else {
        //console.log("Created sessionID="+sid);
        session.sessions[sid]={};
        callback.call(session, undefined, sid);
      }
    }

  };

  /**
   * Save session data
   *
   * @param {String} sid session identifier
   * @param {Object} data session data
   * @param {Function} callback Function called when the session is saved
   * @return {callback(err, status)} The callback to execute as result
   * @param {String} callback.err Error if occurred
   * @param {String} callback.status Result from Redis query
   */
  session.save = function(sid, data, callback) {
    if (isNull(sid)) {
      if (callback) {
        callback.call(session, 'no sid given', undefined);
      }
      return;
    }

    if (cfg.db) {
      cfg.db.insertKeyPair('cookies',sid, data, function (err,res){
        if (err) {
          console.log('Error insertKeyPair ');
          console.log(err);
          return callback.call(session, err, null);
        } else {
          console.log('getKey returned ')
          console.log(res)
          if (!cfg.persist)
            session.timeouts[sid] = setTimeout(function(){session.destroy(sid)}, cfg.ttl*1000);

          callback.call(session, undefined, data);
        }
      })
    } else {
      session.sessions[sid]=data;
   

      if (!cfg.persist)
        session.timeouts[sid] = setTimeout(function(){session.destroy(sid)}, cfg.ttl*1000);

      callback.call(session, undefined, data);
    }

  };

  /**
   * Load session data
   *
   * @param {String} sid session identifier
   * @param {Function} callback Function called when the session is loaded
   * @return {callback(err, data)} The callback to execute as result
   * @param {String} callback.err Error if occurred
   * @param {Object} callback.data session data
   */
  session.load = function(sid, callback) {
    if (isNull(sid)) {
      if (callback) {
        callback.call(session, 'no sid given', undefined);
      }
      return;
    }

    if (cfg.db) {
      cfg.db.getKey('cookies',sid, function (err,res){
        if (err) {
          console.log('Error insertKeyPair ');
          console.log(err);
          return callback.call(session, err, null);
        } else {
          console.log('getKey returned ')
          console.log(res)
          if (!cfg.persist)
            session.timeouts[sid] = setTimeout(function(){session.destroy(sid)}, cfg.ttl*1000);

          callback.call(session, undefined, data);
        }
      })
    } else {
      var data = session.sessions[sid];
      var err=undefined;

      if (data === undefined) err='session.js cannot load sessionID='+sid;
      
      callback.call(session, err, data);
    }
  };

  /**
   * Update the ttl for the session
   *
   * @param {String} sid session identifier
   * @param {Function} callback Function called when the session is refreshed
   * @return {callback(err, active)} The callback to execute as result
   * @param {String} callback.err Error if occurred
   * @param {Boolean} callback.active True if the sid is active (not expired)
   */
  session.refresh = function(sid, callback) {
    if (isNull(sid)) {
      if (callback) {
        callback.call(session, 'no sid given', false);
      }
      return;
    }
    if (cfg.persist) {
      callback.call(session, undefined, true);
      return;
    }

    var err=null;
    if (session.timeouts[sid] != undefined){
      clearTimeout(session.timeouts[sid] )
      session.timeouts[sid] = setTimeout(function(){session.destroy(sid)}, cfg.ttl*1000);
    } else {
      err = 'session.js refresh canot find timeout sessionID='+sid;
    }
    if (callback) 
      callback.call(session, err, true);
  };

  /**
   * Check if a session identifier exists
   *
   * @param {String} sid session identifier
   * @param {Function} callback Function called when the session identifier is verified
   * @return {callback(err, exists)} The callback to execute as result
   * @param {String} callback.err Error if occurred
   * @param {Boolean} callback.exists Return true if the session exists
   */
  session.exists = function(sid, callback) {
    if (isNull(sid)) {
      //console.log('session.js exists called with NULL sid!!');
      callback.call(session, undefined, false);
      return;
    }

    if (cfg.db) {
      cfg.db.getKey('cookies',sid, function (err,res){
        if (err) {
          console.log('Error getKey ');
          console.log(err);
          return callback.call(session, undefined, false );
        } else {
          console.log('getKey returned ')
          console.log(res)
          callback.call(session, undefined, true );
        }
      })
    } else {
      if (session.sessions[sid] != undefined) {
        session.refresh(sid,callback);
        callback.call(session, undefined, true );
      } else
      callback.call(session, undefined, false );
    }
  };

  /**
   * Get all session identifier
   *
   * @param {Function} callback Function called when the session identifiers are loaded
   * @return {callback(err, keys)} The callback to execute as result
   * @param {String} callback.err Error if occurred
   * @param {Array} callback.keys All valid session identifiers
   * @private
   */
  session.getAllKeys = function(callback) {
    if (!cfg.debug) {
      cfg.logger.debug(session.name + ': unable to get all session identifiers when not in debug mode');
      if (callback) {
        callback.call(session, 'unable to get all session identifiers when not in debug mode');
      }
      return;
    }
    var keys = Object.keys(session.sessions);
    if (callback) 
      callback.call(session, err, keys);

  };

  /**
   * Destroy a session
   *
   * @param {String} sid session identifier
   * @param {Function} callback Function called when finishing
   * @return {callback(err, status)} The callback to execute as result
   * @param {String} callback.err Returned error if occurred
   * @param {String} callback.status Returned status code from Redis
   * @private
   */
  session.destroy = function(sid, callback) {
    if (isNull(sid)) {
      if (callback) {
        callback.call(session, 'no sid given', null);
      }
      return;
    }
    if (session.timeouts[sid] !== undefined){
      clearTimeout(session.timeouts[sid]);
      delete session.timeouts[sid];
    }

    if (cfg.db) {
      cfg.db.removeKey('cookies',sid, function (err,res){
        if (err) {
          console.log('Error remove key ');
          console.log(err);
          if (callback) callback.call(session, err, null);
        } else {
          console.log('key removed ')
          console.log(res)
          if (!cfg.persist)
            session.timeouts[sid] = setTimeout(function(){session.destroy(sid)}, cfg.ttl*1000);
          if (callback)
             callback.call(session, undefined, null);
        }
      })
    } else {
      if (session.sessions[sid] !== undefined){
        delete session.sessions[sid];
        if (callback)
          callback.call(session, undefined, null);
      } else
      {
        var err = 'session.js destroy canoot find sessionID='+sid;
        if (callback)
          callback.call(session, err, null);
      }
    }
  };

  /**
   * Destroy all sessions
   *
   * @param {Function} callback Function called when finishing
   * @return {callback(status)} The callback to execute as result
   * @param {String} callback.err Returned error if occurred
   * @param {String} callback.status Returned status code from Redis
   * @private
   */
  session.destroyAll = function(callback) {
    if (!cfg.debug) {
      cfg.logger.debug(session.name + ': unable to destroy all sessions when not in debug mode');
      if (callback) {
        callback.call(session, 'unable to destroy all sessions when not in debug mode');
      }
      return;
    }
    session.sessions={};
    for (var timeout in session.timeouts){
      clearTimeout(session.timeouts[timeout]);
      delete session.timeouts[timeout];
    }
    if (callback) 
      callback.call(session, undefined, true);
  };

  /**
   * Set data in session object to use in other middlewares below this
   *
   * @param {String} sid The session identifier
   * @param {{sid: String, ...}} data The data to store in session
   * @param {{session: data, ...}} req Client request with new __session__ property
   * containing session data
   * @param {Object} res Server response
   * @param {Function} next Calback to execute at the end of saving
   */
  session.setSessionData = function(sid, data, req, res, next) {
    if (isNull(sid)) {
      next();
      return;
    }
    if (isNull(data)) {
      data = {};
    }
    data.sid  = sid;

    req.session = data;
    //console.log('session.js stored data='+toJSON(data)+' in req.session');
    res.setHeader(cfg.sidHeader, sid);

    if (cfg.cookies) {
      var jar = new Cookies(req, res);
      jar.set(session.name,sid);
    }

    if (cfg.db) {
      cfg.db.insertKeyPair('cookies',sid, data, function (err,res){
        if (err) {
          console.log('Error update key data');
          console.log(err);
          next();
        } else {
          console.log('key data updated ')
          console.log(res)
          next();
        }
      })
    } else {
      session.sessions[sid] = data;
      next();
    }
  };

  /**
   * Manage session in http requests
   *
   * @param {Object} req Request from client
   * @param {Object} res Response from server
   * @param {Function} next Next function to execute in server
   */
  session.sessionManager = function (req, res, next) {
    if (cfg.debug) {
      cfg.logger.log(session.name + ': request url: ' + req.url);
    }

    var reqSid = req.headers[cfg.sidHeader.toLowerCase()];
    var rest3dCookie=null;
    if (cfg.cookies) {
      var jar = new Cookies(req,res);
      if (jar)
         rest3dCookie = jar.get(session.name);
    }
    reqSid = reqSid || rest3dCookie;
    session.exists(reqSid, function(existErr, active){
      if (existErr) {
        next();
      } else if (active) {
        // load the session
        session.load(reqSid, function(loadErr, data){
          if (!loadErr) {
            session.setSessionData(reqSid, data, req, res, next);
          } else {
            next();
          }
        });
      } else {
        createSid(function(createErr, sid) {
          if (!createErr) {
            session.setSessionData(sid, {}, req, res, next);
          } else {
            next();
          }
        });
      }
    });
  };

  return session;
};