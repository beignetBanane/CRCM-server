'use strict';

module.exports = function(app) {
  var {CrcmUser} = app.models;

  app.post('/login', function(req, res) {
    CrcmUser.login({
      email: req.body.email,
      password: req.body.password,
    }, 'user', function(err, token) {
      if (err) return res.send(err);
      let resp = {id: token.id};
      res.send(resp);
    });
  });

  app.get('/logout', function(req, res) {
    if (!req.accessToken) return res.sendStatus(401);
    CrcmUser.logout(req.accessToken.id, function(err) {
      if (err) return res.send(err);
      res.sendStatus(200);
    });
  });
};
