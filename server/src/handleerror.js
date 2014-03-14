
module.exports = function (req, res, error) {
          console.log('returning error ='+JSON.stringify(error));
        res.writeHead(500, {
            'Content-Type': req.headers.accept
            .indexOf('application/json') !== -1 ?
              'application/json' : 'text/plain'
          });
          res.end(JSON.stringify(error));
     };