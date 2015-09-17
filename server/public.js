var database = require('./database');
var lib = require('./lib');

exports.getUsernamesByPrefix = function(req, res, next) {
    var prefix = req.params.prefix;

    //Validate prefix
    if(lib.isInvalidUsername(prefix))
        return res.status(400).send('INVALID_PREFIX');

    database.getUsernamesByPrefix(prefix, function(err, usernames) {
        if(err) {
            console.error('[INTERNAL_ERROR] unable to request usernames by prefix: ', usernames);
            return res.status(500).send('INTERNAL_ERROR');
        }

        res.send(JSON.stringify(usernames));
    })
};
