'use strict';

  var passport         = require('passport')
  , GoogleStrategy = require('passport-google').Strategy;

  var Handler = require('./handler')
 
  var Passport = {};

  Passport.ensureAuthenticated = function ensureAuthenticated(handler,cb) {
    if (!handler.req.isAuthenticated())
      handler.redirect('/login');
    else
      cb();
  }
  
  
  Passport.init = function(server) {
      
    server.use(passport.initialize());
    server.use(passport.session()); // not sure we need that at all
    
    server.get('/rest3d/login', function(req, res, next){
      var handler = new Handler(req,res,next);
      handler.db = server.db;
        
      if (!Passport.initialized) {
          Passport.initialized = true;
          var protocol = (req.isSecure() ? 'https' : 'http');
          passport.use(new GoogleStrategy({
            returnURL: protocol + '://' + req.headers.host +'/rest3d/auth/return',
            realm: protocol + '://' + req.headers.host +'/',
          },
          function(identifier, profile, done) {
            var handler = this;
            profile.identifier = identifier;
            // here we save the user info in the database
            if (handler.db)
              handler.db.findUser('google',identifier, function (err,user){
                if (user) return done(null,user);
                // lock this sid as user id
                profile.sid = handler.sid;

                handler.db.createUser(profile.sid,'google',identifier,profile, function (err,user){
                  if (err) {
                    console.log('google login error='+err)
                    return handler.handleError(err);
                  }
                  done(null,user);
                })
              })
            else
              done(null,profile);

          }.bind(handler)));

          passport.serializeUser(function(user, done) {
            done(null, user);
          }.bind(handler));

          passport.deserializeUser(function(obj, done) {
            done(null, obj);
          }.bind(handler));
      }


      passport.authenticate('google')(req, res, function(req, res, next){
        // when exactly do we get there?
        console.log('in the mysterious function')
        var handler = new Handler(req, res, next)
        handler.redirect('/');

      });
    });
    // GET /auth/google/return
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    server.get('/rest3d/auth/return', passport.authenticate('google', { failureRedirect: '/rest3d/login' }), function(req, res, next){

      var handler = new Handler(req, res, next)
      

      handler.redirect('/rest3d/user');

    });

    server.get('/rest3d/logout', function(req, res, next){
      req.logout();
      var handler=new Handler(req,res,next);
      handler.redirect('/rest3d/user');
    });

    server.get('/rest3d/user', function(req, res, next){
      var handler=new Handler(req,res,next);
      if (req.session.passport.user) {
         handler.handleResult({name:req.session.passport.user.name, displayName:req.session.passport.user.displayName, email:req.session.passport.user.emails[0].value})
      } else {
         handler.handleResult({name:'guest'})
      }
    });
  }


  module.exports = Passport;