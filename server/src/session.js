/**
 * session management
 *
 * adapted from: 
 *  https://github.com/mgesmundo/restify-session/blob/master/lib/restify-session.js
 *  @class node_modules.restify_session
 *  @author Marcello Gesmundo
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

// need this to create tmp folder per sid
  var Collection = require('./collection')
  var path = require('path')

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

    var cb = callback;
    codes.length = cLen;

    // generate secure randoms
    rnd(codes);

    for ( i = 0; i < len; i++) {
      rNum = Math.floor(codes[i] * cLen / 255);
      sid += chars.substring(rNum, rNum + 1);
    }

    if (session.sessions[sid] != undefined) {
          createSid(cb);
    } else {
      if (cfg.db) {
        console.log('createSid - check for sid='+sid)
        cfg.db.loadCookie(sid, function (err,res){
          if (err) {
            console.log('createSid new Key='+sid);
            session.sessions[sid]={};
            cb(undefined,sid);
          } else {
            console.log('sid collision - trying again')
            createSid(cb);
          }
        })
      } else {
        console.log("Created sessionID="+sid);
        session.sessions[sid]={};
        cb(undefined,sid);
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
  session.save = function(sid, data, cb) {
    console.log('session.save sid='+sid)
    if (isNull(sid)) {
      cb && cb.call(session, 'no sid given', undefined);
      return;
    }
    session.sessions[sid]=data;
    if (cfg.db) {
      cfg.db.saveCookie(sid,data, function (err,res){
        if (err) {
          console.log('Error save Cookie ='+err);
          return callback.call(session, err, null);
        } else {
          session.refresh(sid,function(err,res) {
            if (err) {
              console.log('session.save -> refresh error='+err)
            } else {
              //console.log('session.save -> refreshed session='+res);
            }
             cb && cb.call(session, undefined, data);
          })
        }
      })
    } else {
       session.refresh(sid,function(err,res) {
            if (err) {
              console.log('session.save -> refresh error='+err)
            } else {
              //console.log('session.save -> refreshed session='+res);
            }
             cb && cb.call(session, undefined, data);
          })
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
  session.load = function(sid, cb) {
    if (isNull(sid)) {
      cb && cb.call(session, 'no sid given', undefined);
      return;
    }
    var data = session.sessions[sid];

    if (data === undefined) {
      if (cfg.db) {
        cfg.db.loadCookie(sid, function (err,res){
          if (err) {
            console.log('session.load Error load Cookie ['+err+']');
            cb && cb.call(session, err, null);
          } else if (!res) {
            err = 'session.load load Cookie returned empty cookie';
            console.log(err);
            cb && cb.call(session, err, null);
          } else {
            console.log('session.load load Cookie returned ['+toJSON(res)+']')
            cb && cb.call(session, undefined, res);
          }
        })
      } else {
        var err='session.js cannot load sessionID='+sid; 
        cb && cb.call(session, err, data);
      }
    } else {
      cb && cb.call(session, undefined, data);
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
  session.refresh = function(sid, cb) {
    if (isNull(sid)) {
      cb && cb.call(session, 'no sid given', false);
      return null;
    }
    if (cfg.persist) {
      cb && cb.call(session, undefined, sid);
      return null;
    }

    var err=undefined;
    if (session.timeouts[sid] != undefined){
      clearTimeout(session.timeouts[sid] )
      //console.log('refresh -> update timeout for sid='+sid)
    } else {
      //console.log('refresh -> new timeout for sid='+sid)
    }
                                        // closure to pass sid value
    session.timeouts[sid] = setTimeout(function(){session.destroy.call(session,sid)},  cfg.ttl*1000 );

    cb && cb.call(session, err, sid);
    return session;
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

  // note cb is often null, this function called in a timeOut
  session.destroy = function(sid, cb) { 

    var self=this;
    
    if (isNull(sid)) return done('no sid given');

    if (self.timeouts[sid] !== undefined){
      clearTimeout(self.timeouts[sid]);
      delete self.timeouts[sid];
    }

    var session = self.sessions[sid];
    if (!session) return deleteCookie(undefined); 

    var done = function(error) {
      self.sessions[sid] && delete self.sessions[sid];
      cb && cb.call(self, error, undefined);
    }

    var deleteCookie = function(error){
      if (error) return done(error)
      if (cfg.db) {
        cfg.db.delCookie(sid, function (err,res){
          if (err) {
            console.log('Error delete Cookie ='+err);
            return done(undefined); // no need to alert client
          } else {
            console.log('key removed cookie ['+sid+']')
             return done(undefined);
          }
        })
      }
    }

   if (session.tmpdir) 
     return self.delTMP(session.tmpdir, deleteCookie);
    deleteCookie(undefined);
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
  var setSessionData = function(sid, data, req, res, next) {

  if (isNull(data)) {
    data = {};
  }
  // important! this is used by other modules to get the current sid
  data.sid  = sid;

  req.session = data;
  //console.log('session.js stored data='+toJSON(data)+' in req.session');
  res.setHeader(cfg.sidHeader.toLowerCase(), sid);//add header

  if (cfg.cookies) {
    var jar = new Cookies(req, res);
    jar.set(session.name,sid);//add cookie
  }

  next && next(data);

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

      cfg.logger.log('SessionManager !!')
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
    
    session.load(reqSid, function(loadErr, data){
      if (loadErr) {
        if (cfg.debug)
          cfg.logger.log('creating new Key')
        createSid(function(createErr, sid) {
          if (!createErr) {
            console.log('sessionManager -> addSessionData:'+sid);
            setSessionData(sid, {}, req, res, function(data){
              session.save(sid, data, function(err,data) {
                if (err) 
                  console.log('sessionManager session.save error='+err)
                next();
              })
            })
            
          } else {
            console.log('sessionManager error createSid='+sid)
            next();
          }
        });
      } else {
        if (cfg.debug)
          cfg.logger.log('sessionManager found Key ='+reqSid);
        session.refresh(reqSid,function(err,resp) {
          setSessionData(reqSid, data, req, res, next);
        })

      }

    });
  }

  return session;
};