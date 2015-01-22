var assert = require('assert');
var compression = require('compression');
var express = require('express');
var fs = require('fs');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var app = express();

var routes = require('./server/routes');
var database = require('./server/database');
var lib = require('./server/lib');
var dotCaching = true;

var _ = require('lodash');

// Simplify and de-verbosify timeago output.
var timeago = require('timeago');
var timeago_strings = _.extend(timeago.settings.strings, {
  seconds: '< 1 min',
  minute: '1 min',
  minutes: '%d mins',
  hour: '1 hour',
  hours: '%d hours',
  day: '1 day',
  days: '%d days',
  month: '1 month',
  months: '%d months',
  year: '1 year',
  years: '%d years'
});
timeago.settings.strings = timeago_strings;

app.use(bodyParser());
app.use(cookieParser());

app.set("views", path.join(__dirname, '/views'));

if (process.env.NODE_ENV !== 'production') {
    app.locals.pretty = true;
    dotCaching = false;
}

app.engine("html", require("dot-emc").init(
    {
        app: app,
        fileExtension:"html",
        options: {
            templateSettings: {
                cache: dotCaching
            }
        }
    }
).__express);
app.set("view engine", "html");
app.disable('x-powered-by');
app.enable('trust proxy');

app.use(compression());

var twoWeeksInSeconds = 1209600;
app.use(express.static(path.join(__dirname, '/client'), { maxAge: twoWeeksInSeconds * 1000 }));

app.use(function(req, res, next) {
    var sessionId = req.cookies.id;

    if (!sessionId) {
        res.header('Vary', 'Accept, Accept-Encoding, Cookie');
        res.header('Cache-Control', 'public, max-age=60'); // Cache the logged-out version
        return next();
    }

    res.header('Cache-Control', 'no-cache');

    if (!lib.isUUIDv4(sessionId)) {
        res.clearCookie('id');
        return next();
    }

    database.getUserBySessionId(sessionId, function(err, user) {
        //The error is handled manually to avoid sending it into routes
        if (err) {
            if (err === 'NOT_VALID_SESSION') {
                res.clearCookie('id');
                return res.redirect('/');
            } else {
                console.error('[INTERNAL_ERROR] Unable to get user by session id ' + sessionId + ':', err);
                return res.redirect('/error');
            }
        }
        user.advice = req.query.m;
        user.error = req.query.err;
        user.eligible = lib.isEligibleForGiveAway(user.last_giveaway);
        user.admin = user.userclass === 'admin';
        user.moderator = user.userclass === 'admin' ||
                         user.userclass === 'moderator';
        req.user = user;
        next();
    });

});

/**
 * How to handle the errors:
 * If the error is a string: Send it to the client.
 * If the error is an actual: error print it to the server log.
 *
 * We do not use next() to avoid sending error logs to the client
 * so this should be the last middleware in express .
 */

function errorHandler(err, req, res, next) {

    if (err) {
        if(typeof err === 'string') {
            return res.render('error', { error: err });
        } else {
            if (err.stack) {
                console.error('[INTERNAL_ERROR] ', err.stack);
            } else console.error('[INTERNAL_ERROR', err);

            res.render('error');
        }

    } else {
        console.warning("A 'next()' call was made without arguments, if this an error or a msg to the client?");
    }

}

routes(app);
app.use(errorHandler);


var port = process.env.PORT || 3841;

var server = http.createServer(app).listen(port, function() {
    console.log('Listening on port ', port);
});