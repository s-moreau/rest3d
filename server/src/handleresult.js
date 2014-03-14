module.exports = function(req, res, result, redirect) {

        if (redirect) {
          res.writeHead(302, {
            'Location': redirect.replace(
            /%s/,
            encodeURIComponent(JSON.stringify(result))
            )
          });
          res.end();
        } else {
          res.writeHead(200, {
            'Content-Type': req.headers.accept
            .indexOf('application/json') !== -1 ?
              'application/json' : 'text/plain'
          });
          res.end(JSON.stringify(result));
        }
      };
