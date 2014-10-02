var CBuffer = require('CBuffer');
var socketio = require('socket.io');
var database = require('./database');
var lib = require('./lib');
var withdraw = require('../server/withdraw.js');

module.exports = function(server,game) {
    var io = socketio(server);

    (function() {
        function on(event) {
            game.on(event, function (data) {
                io.to('joined').emit(event, data);
            });
        }

        on('game_starting');
        on('game_started');
        on('game_tick');
        on('game_crash');
        on('cashed_out');
        on('player_bet');
        on('say');
    })();

    var chatHistory = new CBuffer(40);

    io.on('connection', onConnection);

    var shutdownfast = false;
    function onConnection(socket) {
        if (shutdownfast) {
            socket.emit('update');
            return;
        }

        game.on('shutdownfast', function() {
            shutdownfast = true;
            socket.emit('update');
        });

        socket.once('join', function(info, ack) {
            if (typeof ack !== 'function')
                return sendError(socket, '[join] No ack function');

            if (typeof info !== 'object')
                return sendError(socket, '[join] Invalid info');

            var autoCashOut; // can be null
            if (info.auto_cash_out) {
                if (!lib.isInt(info.auto_cash_out) || info.auto_cash_out <= 100)
                    return sendError(socket, '[join] Invalid auto cash out');

                autoCashOut = info.auto_cash_out;
            }

            var ott = info.ott;
            if (ott) {
                if (!lib.isUUIDv4(ott))
                    return sendError(socket, '[join] ott not valid');

                database.validateOneTimeToken(ott, function (err, user) {
                    if (err) {
                        if (err == 'NOT_VALID_TOKEN')
                            return ack(err);
                        return internalError(socket, err, 'Unable to validate ott');
                    }
                    cont(user);
                });
            } else {
                cont(null);
            }

            function cont(loggedIn) {
                var res = game.getInfo();
                res['chat'] = chatHistory.toArray();
                res['table_history'] = game.gameHistory.getHistory();
                res['username'] = loggedIn ? loggedIn.username : null;
                res['balance_satoshis'] = loggedIn ? loggedIn.balance_satoshis : null;
                ack(null, res);

                // Set admin flag. TODO: Move to db.
                if (loggedIn)
                    loggedIn.admin = loggedIn.username === 'Eric';

                joined(socket, loggedIn, autoCashOut);
            }
        });

    }

    var clientCount = 0;

    function joined(socket, loggedIn, autoCashOut) {
        ++clientCount;
        console.log('Client joined: ', clientCount, ' - ', loggedIn ? loggedIn.username : '~guest~');

        socket.join('joined');

        socket.on('disconnect', function() {
            --clientCount;
            console.log('Client disconnect, left: ', clientCount);

            if (loggedIn)
                game.cashOut(loggedIn, function(err) {
                    if (err && typeof err !== 'string')
                        console.log('Error: auto cashing out got: ', err);
                });
        });

        if (loggedIn)
        socket.on('place_bet', function(amount, autoCashOut, ack) {

            if (!lib.isInt(amount)) {
                return sendError(socket, '[place_bet] No place bet amount: ' + amount);

            }
            if (amount <= 0 || !lib.isInt(amount / 100)) {
                return sendError(socket, '[place_bet] Must place a bet in multiples of 100, got: ' + amount);
            }

            if (amount > 1e7) // .1 BTC limit
                return sendError(socket, '[place_bet] Max bet size is .1 BTC got: ' + amount);


            if (!autoCashOut)
                autoCashOut = null;
            else if (!lib.isInt(autoCashOut) || autoCashOut < 100)
                return sendError(socket, '[place_bet] auto_cashout problem');

            if (typeof ack !== 'function')
                return sendError(socket, '[place_bet] No ack');

            game.placeBet(loggedIn, amount, autoCashOut, function(err) {
                if (err) {
                    if (typeof err === 'string')
                        ack(err);
                    else {
                        console.error('[INTERNAL_ERROR] unable to place bet, got: ', err);
                        ack('INTERNAL_ERROR');
                    }
                    return;
                }

                ack(null); // TODO: ... deprecate
            });
        });

        socket.on('cash_out', function(ack) {
            if (!loggedIn)
                return sendError(socket, '[cash_out] not logged in');

            if (typeof ack !== 'function')
                return sendError(socket, '[cash_out] No ack');

            game.cashOut(loggedIn, function(err) {
                if (err) {
                    if (typeof err === 'string')
                        return ack(err);
                    else
                        return console.log('[INTERNAL_ERROR] unable to cash out: ', err); // TODO: should we notify the user?
                }

                ack(null);
            });
        });

        socket.on('say', function(message) {
            if (!loggedIn)
                return sendError(socket, '[say] not logged in');

            if (typeof message !== 'string')
                return sendError(socket, '[say] no message');

            if (message.length == 0 || message.length > 500)
                return sendError(socket, '[say] invalid message side');

            if (loggedIn.admin && message === '/shutdown') {
                game.shutDown();
                return;
            }

            var msg = {
                time: new Date(),
                message: message,
                username: loggedIn.username
            };

            chatHistory.push(msg);
            io.to('joined').emit('say', msg);
        });


        socket.on('set_auto_cash_out', function(amount) {
            if (!loggedIn)
                return sendError(socket, '[set_auto_cash_out] not logged in');

            console.log(amount, typeof amount);
            if (!amount)
                amount = null;
            else if (!lib.isInt(amount) || amount <= 100)
                return sendError(socket, '[set_auto_cash_out] amount problem');

            autoCashOut = amount;
            game.updateAutoCashOut(loggedIn, autoCashOut);
        });
    }

    function sendError(socket, description) {
        console.warn('Warning: sending client: ', description);
        socket.emit('err', description);
    }

    function internalError(socket, err, description) {
        console.error('[INTERNAL_ERROR] got error: ', err, description);
        socket.emit('err', 'INTERNAL_ERROR');
    }
};
