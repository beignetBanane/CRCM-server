'use strict';

module.exports = function(app) {
  var {CrcmUser} = app.models;
  app.post('/login', function(req, res) {
    console.log('login', req);
    // console.log('login', req.body.email, req.body.password);
    CrcmUser.login({
      email: req.body.email,
      password: req.body.password,
    }, 'user', function(err, token) {
      if (err) {
        console.log('login failed', err);
      }
    });
  });

  app.get('/logout', function(req, res) {
    if (!req.accessToken) return res.sendStatus(401);
    CrcmUser.logout(req.accessToken.id, function(err) {
      if (err) {
        console.log('logout failed', err);
      }
    });
  });
};
