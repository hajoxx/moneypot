var assert = require('assert');
var compression = require('compression');
var express = require('express');
var fs = require('fs');
var https = require('https');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var app = express();


var routes = require('./server/routes');
var socket = require('./server/socket');
var database = require('./server/database');
var Game = require('./server/game');
var Chat = require('./server/chat');
var GameHistory = require('./server/gamehistory');
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
        if (err) {
            if (err === 'NOT_VALID_SESSION') {
                res.clearCookie('id');
            } else {
                console.error('[INTERNAL_ERROR] while getting user by session ', err);
                return res.redirect('/error');
            }
            return next();
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

function errorHandler(err, req, res, next) {

    if (err) {
        if (err.stack) {
            console.error('[INTERNAL_ERROR] ', err, err.stack);
        } else console.error('[INTERNAL_ERROR', err);

        return res.render('error');
    }
    next();
}

routes(app);
app.use(errorHandler);



var port = process.env.PORT || 3841;
var options = {
    key: fs.readFileSync(process.env.HTTPS_KEY || 'key.pem'),
    cert: fs.readFileSync(process.env.HTTPS_CERT || 'cert.pem')
};

var server = https.createServer(options, app).listen(port, function() {
    console.log('Listening on port ', port, ' on HTTPS!');
});



database.getGameHistory(function(err,rows) {
    if (err) {
        console.error('[INTERNAL_ERROR] got error: ', err,
            'Unable to get table history');
        throw err;
    }

    var gameHistory = new GameHistory(rows);
    var game = new Game(gameHistory);
    var chat = new Chat();

    process.on('SIGTERM', function() {
        console.log('Got SIGTERM... triggering emergency shutdown');
        game.shutDownFast();
    });

    socket(server, game, chat);
});