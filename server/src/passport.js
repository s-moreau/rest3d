'use strict';

  var passport         = require('passport')
  , GoogleStrategy = require('passport-google').Strategy;

  var Handler = require('./handler')
 
  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  passport.use(new GoogleStrategy({
    returnURL: 'http://localhost:3000/auth/google/return',
    realm: 'http://localhost:3000/'
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }))



  var Passport = {};
  


  Passport.ensureAuthenticated = function ensureAuthenticated(handler,cb) {
    if (!handler.req.isAuthenticated())
      handler.redirect('/login');
    else
      cb();
  }
  
  
  Passport.init = function(server) {
      
    server.use(passport.initialize());
    server.use(passport.session());
    
    server.get('/rest3d/login', function(req, res, next){
        
      if (!Passport.initialized) {
          Passport.initialized = true;
          passport.use(new GoogleStrategy({
            returnURL: (req.isSecure()) ? 'https' : 'http' + '://' + req.headers.host +'/rest3d/auth/return',
            realm: (req.isSecure()) ? 'https' : 'http' + '://' + req.headers.host +'/',
          },
          function(identifier, profile, done) {
            // asynchronous verification, for effect...
            process.nextTick(function () {
              
              // To keep the example simple, the user's Google profile is returned to
              // represent the logged-in user.  In a typical application, you would want
              // to associate the Google account with a user record in your database,
              // and return that user instead.
              profile.identifier = identifier;
              return done(null, profile);
            });
          }))
      }

      passport.authenticate('google', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }
        req.logIn(user, function(err) {
          if (err) { return next(err); }
          return res.redirect('/users/' + user.username);
        });
      })(req, res, function(req, res, next){

        var handler = new Handler(req, res, next)
        handler.redirect('/');
        //res.redirect('/');
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
      //res.redirect('/');
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