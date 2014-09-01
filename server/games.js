 var assert = require('better-assert');
 var async = require('async');
 var timeago = require('timeago');
 var database = require('./database');


exports.show = function(req, res, next) {
    var user = req.user;
    var gameId = parseInt(req.params.id);

    if (!gameId || typeof gameId !== 'number') return res.render('404');

    database.getGame(gameId, function(err, game) {
        if (err) {
            if (err === 'GAME_DOES_NOT_EXISTS')
                return res.render('404');

            return next(new Error('unable to get game: ' + err));
        }

        database.getGamesPlays(game.id, function(err, plays) {
            if (err)
                return next(new Error('unable to get game information: ' + err));

            game.timeago = timeago(game.created);
            res.render('game', { game: game, plays: plays, user: user });
        });
    });
};


 exports.getLeaderBoard = function(req, res, next) {
     var user = req.user;

     database.getLeaderBoard(function(err, leaders) {
         if (err)
             return next(new Error('Unable to get leader board: '));

        res.render('leaderboard', {user: user, leaders: leaders});
     });
 };

