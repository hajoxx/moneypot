var database = require('./database');


exports.getUsernamesByPrefix = function(req, res, next) {
    var prefix = req.params.prefix;

    //Validate prefix
    if (typeof prefix !== 'string' || !/^[a-z0-9_]{1,32}$/i.test(prefix))
        return res.status(400).send('INVALID_PREFIX');

    database.getUsernamesByPrefix(prefix, function(err, usernames) {
        if(err) {
            console.error('[INTERNAL_ERROR] unable to request usernames by prefix: ', usernames);
            res.status(500).send('INTERNAL_ERROR');
        }

        res.send(JSON.stringify(usernames));
    })
};
