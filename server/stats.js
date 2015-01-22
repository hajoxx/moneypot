var AsyncCache = require('async-cache');
var database = require('./database');
var timeago = require('timeago');

var stats = new AsyncCache({
    max: 1,
    maxAge: 1000 * 60 * 5,
    load: function (key, cb) {
        database.getSiteStats(function(err, results) {
            if (err) return cb(err);

            results.generated = new Date();
            cb(null, results);
        });
    }
});

exports.index = function(req, res, next) {
    var user = req.user;

    stats.get('stats', function(err, results) {
        if (err)
            return next(new Error('Unable to get site stats: \n' + err));

        res.render('stats', { user: user, generated: timeago(results.generated), stats: results });
    });
};