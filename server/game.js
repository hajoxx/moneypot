var assert = require('better-assert');
var async = require('async');
var db = require('./database');
var events = require('events');
var util = require('util');
var cryptoRand = require('crypto-rand');
var _ = require('lodash');
var lib = require('./lib');

var maxWin = process.env.MAX_LOSS ? parseInt(process.env.MAX_LOSS) : 2e8; // The max loss in a single game, in satoshis
var tickRate = 150; // ping the client every X miliseconds
var afterCrashTime = 3000; // how long from game_crash -> game_starting
var restartTime = 5000; // How long from  game_starting -> game_started

function Game(gameHistory) {
    var self = this;

    self.gameShuttingDown = false;
    self.gameShuttingDownFast = false;
    self.pending = 0; // How many people are trying to join the game...
    self.seed = null;
    self.startTime; // time game started. If before game started, is an estimate...
    self.crashPoint; // when the game crashes, 0 means instant crash
    self.gameDuration; // how long till the game will crash..

    self.forcePoint = null; // The point we force terminate the game

    self.state = 'ENDED'; // 'STARTING' | 'IN_PROGRESS' |  'ENDED'
    self.blocking = false; // the game is transitioning to inprogress, so blocking new join attempts
    self.players = {}; // An object of userName ->  { playId: ..., autoCashOut: .... }
    self.gameId = null;
    self.gameHistory = gameHistory;

    events.EventEmitter.call(self);

    function runGame() {

        if (self.gameShuttingDown || self.gameShuttingDownFast) {
            console.log('Not creating next game, server shutting down..');
            return;
        }

        var crashPoint = genGameCrash();
        var seed = lib.randomHex(16);


        db.createGame(crashPoint, seed, function (err, gameId) {
            if (err) {
                console.log('Could not create game', err, ' retrying in 2 sec..');
                setTimeout(runGame, 2000);
                return;
            }

            self.state = 'STARTING';
            self.seed = seed;
            self.crashPoint = crashPoint;
            self.gameId = gameId;
            self.startTime = new Date(Date.now() + restartTime);
            self.players = {}; // An object of userName ->  { user: ..., playId: ..., autoCashOut: ...., status: ... }
            self.gameDuration = Math.ceil(inverseGrowth(self.crashPoint + 1)); // how long till the game will crash..

            self.emit('game_starting', {
                game_id: gameId,
                hash: lib.sha(self.crashPoint + '|' + self.seed),
                time_till_start: restartTime
            });

            setTimeout(startGame, restartTime);
        });
    }

    function startGame() {
        if (self.pending > 0) {
            self.blocking = true; // Stop anyone else trying to join..
            console.log('Table  has ', self.pending, ' bet.. delaying by 100ms');
            return setTimeout(startGame, 100);
        }

        self.state = 'IN_PROGRESS';
        self.blocking = false;
        self.startTime = new Date();

        self.setForcePoint();

        self.emit('game_started', { created: self.startTime });  // NOTE: this is approximate, and db value will be earlier

        callTick(0);
    }

    function callTick(elapsed) {
        var left = self.gameDuration - elapsed;
        var nextTick = Math.max(0, Math.min(left, tickRate));

        setTimeout(runTick, nextTick);
    }


    function runTick() {
        if (self.gameShuttingDownFast) {
            console.log('..aborting tick');
            return;
        }

        var elapsed = new Date() - self.startTime;
        var at = growthFunc(elapsed);

        self.runCashOuts(at);

        if (self.forcePoint && self.forcePoint <= at && self.forcePoint < self.crashPoint) {
            self.cashOutAll(self.forcePoint, function (err) {
                console.log('Just forced cashed out everyone at: ', self.forcePoint, ' got err: ', err);

                crashGame();
            });
            return;
        }

        // and run the next

        if (at > self.crashPoint)
            crashGame();
        else
            tick(elapsed, at);
    }

    function crashGame() {
        // oh noes, we crashed!
        self.endGame();

        if (self.gameShuttingDown) {
            self.emit('shutdown');
        } else {
            setTimeout(runGame, afterCrashTime);
        }
    }

    function tick(elapsed, at) {
        self.emit('game_tick', {
            elapsed: elapsed
        });

        callTick(elapsed);
    }

    runGame();
}

util.inherits(Game, events.EventEmitter);

Game.prototype.updateAutoCashOut = function(user, amount) {
    assert(user.username);
    assert(amount == null || Number.isFinite(amount));
    var self = this;

    if (this.state === 'ENDED')
        return false;

    var play = lib.getOwnProperty(self.players, user.username);

    if (!play)
        return false;

    var elapsed = new Date() - self.startTime;
    var at = growthFunc(elapsed);

    var use = Math.max(at, amount);
    play.autoCashOut = use;

    return true;
};

Game.prototype.endGame = function() {
    var self = this;

    var gameId = self.gameId;

    assert(self.crashPoint == 0 || self.crashPoint >= 100);

    // instant crash don't get bonuses..
    var bonuses = (self.crashPoint === 0) ? [] : calcBonuses(self.players);


    var playerInfo = self.getInfo().player_info;
    var bonusJson = {};
    bonuses.forEach(function(entry) {
        bonusJson[entry.user.username] = entry.amount;
        playerInfo[entry.user.username].bonus = entry.amount;
    });


    // oh noes, we crashed!
    self.emit('game_crash', {
        elapsed: self.gameDuration,
        game_crash: self.crashPoint, // We send 0 to client in instant crash
        bonuses: bonusJson,
        seed: self.seed
    });

    self.gameHistory.addCompletedGame(
      { game_id: gameId,
        game_crash: self.crashPoint,
        created: self.startTime,
        player_info: playerInfo
      });

    db.endGame(gameId, bonuses, function(err) {
        if (err)
            console.log('ERROR could not end game id: ', gameId, ' got err: ', err);
    });

    self.state = 'ENDED';
    assert(!self.blocking);
};

Game.prototype.getInfo = function() {

    var playerInfo = {};

    for (var username in this.players) {
        var record = this.players[username];

        if (record.status === 'PENDING')
            continue;

        assert(lib.isInt(record.bet));
        var info = {
            bet: record.bet
        };

        if (record.status === 'CASHED_OUT') {
            assert(lib.isInt(record.stoppedAt));
            info['stopped_at'] = record.stoppedAt;
        }

        playerInfo[username] = info;
    }


    var res = {
        state: this.state,
        player_info: playerInfo,
        game_id: this.gameId, // null between game crash, and game starting..
        hash: lib.sha(this.crashPoint + '|' + this.seed),
        // if the game is pending, elapsed is how long till it starts
        // if the game is running, elapsed is how long its running for
        /// if the game is ended, elapsed is how long since the game started
        elapsed: Date.now() - this.startTime,
        created: this.startTime
    };

    if (this.state === 'ENDED')
        res.crashed_at = this.crashPoint;

    return res;
};

// Calls callback with (err, booleanIfAbleToJoin)
// autoCashOut is nullable
Game.prototype.placeBet = function(user, betAmount, autoCashOut, callback) {
    var self = this;

    assert(typeof user.id === 'number');
    assert(typeof user.username === 'string');
    assert(lib.isInt(betAmount));

    if (self.state !== 'STARTING' || self.blocking)
        return callback('GAME_IN_PROGRESS');

    if (lib.hasOwnProperty(self.players, user.username))
        return callback('ALREADY_PLACED_BET');

    self.players[user.username] = { user: user, bet: betAmount, autoCashOut: autoCashOut, status: 'PENDING', playId: null };
    self.pending++;

    db.placeBet(betAmount, user.id, self.gameId, function(err, playId) {
        self.pending--;

        if (err) {
            delete self.players[user.username];
            if (err.code == '23514') // constraint violation (it's withdrawing less than 0)
                return callback('NOT_ENOUGH_MONEY');

            console.log('[INTERNAL_ERROR] could not play game, got error: ', err);
            return callback(err);
        }

        assert(playId > 0);
        self.players[user.username].playId = playId;
        self.players[user.username].status = 'PLAYING';

        var res = {
            username: user.username,
            bet: betAmount
        };
        self.emit('player_bet', res);
        callback(null);
    });
};



Game.prototype.doCashOut = function(play, at, callback) {
    assert(typeof play.user.username === 'string');
    assert(typeof play.user.id == 'number');
    assert(typeof play.playId == 'number');
    assert(typeof at === 'number');
    assert(typeof callback === 'function');

    var self = this;

    var username = play.user.username;

    assert(self.players[username].status === 'PLAYING');
    self.players[username].status = 'CASHED_OUT';
    self.players[username].stoppedAt = at;

    var won = Math.round(self.players[username].bet * (at / 100));

    self.emit('cashed_out', {
        username: username,
        amount: won, // TODO: deprecate
        stopped_at: at
    });

    db.cashOut(play.user.id, play.playId, won, function(err) {
        if (err) {
            console.log('[INTERNAL_ERROR] could not cash out: ', username, ' at ', at, ' in ', play, ' because: ', err);
            callback(err);

            // TODO: consider put them back in the game if its still running

            return;
        }

        callback(null);
    });
};

Game.prototype.runCashOuts = function(at) {
    var self = this;

    var update = false;
    // Check for auto cashouts

    Object.keys(self.players).forEach(function (playerUserName) {
        var play = self.players[playerUserName];

        if (play.status === 'CASHED_OUT')
            return;

        assert(play.status === 'PLAYING');

        // autoCashOut can be null...
        if (play.autoCashOut && play.autoCashOut <= at && play.autoCashOut <= self.crashPoint) {
            self.doCashOut(play, play.autoCashOut, function (err) {
                if (err) {
                    console.log('[INTERNAL_ERROR] could not auto cashout ', playerUserName, ' at ', play.autoCashOut);
                    return;
                }
            });
            update = true;
        }
    });

    if (update)
        self.setForcePoint();
};

Game.prototype.setForcePoint = function() {
   var self = this;

   var totalBet = 0; // how much satoshis is still in action
   var totalCashedOut = 0; // how much satoshis has been lost

   Object.keys(self.players).forEach(function(playerName) {
       var play = self.players[playerName];

       if (play.status === 'CASHED_OUT') {
           var amount = play.bet * (play.stoppedAt - 100) / 100;
           totalCashedOut += amount;
       } else {
           assert(play.status == 'PLAYING' || play.status === 'PENDING');
           assert(lib.isInt(play.bet));
           totalBet += play.bet;
       }
   });

   if (totalBet === 0) {
       self.forcePoint = null; // the game can go until it crashes, there's no end.
   } else {
       var left = maxWin - totalCashedOut;

       var ratio =  (left+totalBet) / totalBet;

       // in percent
       self.forcePoint = Math.max(Math.floor(ratio * 100), 101);
   }

};

Game.prototype.cashOut = function(user, callback) {
    var self = this;

    assert(typeof user.id === 'number');

    if (this.state !== 'IN_PROGRESS')
        return callback('GAME_NOT_IN_PROGRESS');

    var elapsed = new Date() - self.startTime;
    var at = growthFunc(elapsed);
    var play = lib.getOwnProperty(self.players, user.username);

    if (!play)
        return callback('NO_BET_PLACED');

    if (play.autoCashOut && play.autoCashOut <= at)
        at = play.autoCashOut;

    if (self.forcePoint && self.forcePoint <= at)
        at = self.forcePoint;


    if (at > self.crashPoint)
        return callback('GAME_ALREADY_CRASHED');

    if (play.status === 'CASHED_OUT')
        return callback('ALREADY_CASHED_OUT');

    if (play.status === 'PENDING') {
        console.log('Trying to cash out pending bet, rescheduling for 50ms...');
        setTimeout(function() {
            self.cashOut(user, callback);
        }, 50);
        return;
    }

    self.doCashOut(play, at, callback);
    self.setForcePoint();
};

Game.prototype.cashOutAll = function(at, callback) {
    var self = this;

    if (this.state !== 'IN_PROGRESS')
        return callback();

    console.log('Cashing everyone out at: ', at);

    assert(at >= 100);

    self.runCashOuts(at);

    if (at > self.crashPoint)
        return callback(); // game already crashed, sorry guys

    var tasks = [];

    Object.keys(self.players).forEach(function(playerName) {
        var play = self.players[playerName];

        if (play.status === 'PLAYING') {
            tasks.push(function (callback) {
                if (play.status === 'PLAYING')
                    self.doCashOut(play, at, callback);
                else
                    callback();
            });
        }
    });

    console.log('Needing to force cash out: ', tasks.length, ' players');

    async.parallelLimit(tasks, 4, function (err) {
        if (err) {
            console.error('[INTERNAL_ERROR] unable to cash out all players in ', self.gameId, ' at ', at);
            callback(err);
            return;
        }
        console.log('Emergency cashed out all players in gameId: ', self.gameId);

        callback();
    });
};

Game.prototype.shutDown = function() {
    var self = this;

    self.gameShuttingDown = true;
    self.emit('shuttingdown');

    // If the game has already ended, we can shutdown immediately.
    if (this.state === 'ENDED') {
        self.emit('shutdown');
    }
};

Game.prototype.shutDownFast = function() {
    var self = this;
    var elapsed = new Date() - self.startTime;
    var at = growthFunc(elapsed);

    self.gameShuttingDown = true;
    self.gameShuttingDownFast = true;
    self.emit('shuttingdown');

    self.cashOutAll(at, function (err) {

        console.log('Just cashed everyone out ', at, ' for shut down with error: ', err);

        if (!err)
            self.endGame();

        self.emit('shutdownfast');
    });

};

/// returns [ {playId: ?, user: ?, amount: ? }, ...]
function calcBonuses(input) {
    // first, lets sum the bets..

    function sortCashOuts(input) {
        function r(c) {
            return c.stoppedAt ? -c.stoppedAt : null;
        }

        return _.sortBy(input, r);
    }

    // slides fn across array, providing [listRecords, stoppedAt, totalBetAmount]
    function slideSameStoppedAt(arr, fn) {
        var i = 0;
        while (i < arr.length) {
            var tmp = [];
            var betAmount = 0;
            var sa = arr[i].stoppedAt;
            for (; i < arr.length && arr[i].stoppedAt === sa; ++i) {
                betAmount += arr[i].bet;
                tmp.push(arr[i]);
            }
            assert(tmp.length >= 1);
            fn(tmp, sa, betAmount);
        }
    }

    var results = [];

    var sorted = sortCashOuts(input);

    if (sorted.length  === 0)
        return results;

    var bonusPool = 0;
    var largestBet = 0;

    for (var i = 0; i < sorted.length; ++i) {
        var record = sorted[i];

        assert(record.status === 'CASHED_OUT' || record.status === 'PLAYING');
        assert(record.playId);
        var bet = record.bet;
        assert(lib.isInt(bet));

        bonusPool += bet / 100;
        assert(lib.isInt(bonusPool));

        largestBet = Math.max(largestBet, bet);
    }

    var maxWinRatio = bonusPool / largestBet;

    slideSameStoppedAt(sorted,
        function(listOfRecords, cashOutAmount, totalBetAmount) {
            if (bonusPool <= 0)
                return;

            var toAllocAll = Math.min(totalBetAmount * maxWinRatio, bonusPool);

            for (var i = 0; i < listOfRecords.length; ++i) {
                var toAlloc = Math.round((listOfRecords[i].bet / totalBetAmount) * toAllocAll);

                if (toAlloc <= 0)
                    continue;

                bonusPool -= toAlloc;

                var playId = listOfRecords[i].playId;
                assert(lib.isInt(playId));
                var user = listOfRecords[i].user;
                assert(user);

                results.push({
                    playId: playId,
                    user: user,
                    amount: toAlloc
                });
            }
        }
    );

    return results;
}


function growthFunc(ms) {
    var r = 0.00006;
    return Math.floor(100 * Math.pow(Math.E, r * ms));
}

function inverseGrowth(result) {
    var c = 16666.666667;
    return c * Math.log(0.01 * result);
}

// calculate game crash in %
//   e.g. 150 = 1.50x crash
function genGameCrash() {
    if (process.env.CRASH_AT) { // Set env variable to simulate a crash at...
        if (process.env.NODE_ENV == 'production') throw new Error('wtf? manual crashing on prod?');
        var at = parseInt(process.env.CRASH_AT);
        if (!lib.isInt(at) || (at < 100 && at != 0))
            throw new Error('If using CRASH_AT it must be an integer >= 100 (or 0 for instant crash)');
        return at;
    }

    var ic = cryptoRand.randInt(0, 100); // 1 in 101 chance
    if (ic === 0)
        return 0; // instant crash;

    var r = cryptoRand.rand();
    var perfect = (1 / (1 - r));

    var houseEdge = (perfect-1) * 0.01;

    var multiplier = perfect - houseEdge;

    return Math.floor(multiplier * 100);
}

module.exports = Game;
