define([
    'lib/socket.io-1.2.1',
    'lib/events',
    'lib/lodash',
    'lib/clib',
    'constants/AppConstants'
], function(
    io,
    Events,
    _,
    Clib,
    AppConstants
) {

    function Engine() {
        var self = this;

        /**
         * Engine inherits from BackBone events:
         * http://backbonejs.org/#Events
         * which means it has events like .on, off, .trigger, .once, .listenTo, .stopListening
         */
        _.extend(this, Events);

        self.ws = io(AppConstants.Engine.HOST);

        /** The engine is connected to the server, if not connected, all fields are unreadable */
        self.isConnected = false;

        /** The username or null if is not logged in */
        self.username = null;

        /** The balance of the user */
        self.balanceSatoshis = null;

        /** Max bet will be sent by the server in the future, for now is a constant **/
        self.maxBet = AppConstants.Engine.MAX_BET;

        /** Array containing chat history */
        self.chat = [];

        /** Object containing the game history */
        self.tableHistory = [];

        // The current players who joined the game, while the game is STARTING
        self.joined = [];

        /** Object containing the current game players and their status, this is saved in game history every game crash */
        self.playerInfo = null;

        /**
         * The state of the game
         * Possible states: IN_PROGRESS, ENDED, STARTING
         */
        self.gameState = null;

        /** Creation time of current game. This is the server time, not clients.. **/
        self.created = null;

        /** The game id of the current game */
        self.gameId = null;

        /**
         * if the game is pending, startTime is how long till it starts
         * if the game is running, startTime is how long its running for
         * if the game is ended, startTime is how long since the game started
         */
        self.startTime = null;

        /** If you are currently placing a bet
         * True if the bet is queued
         * True if the bet was sent to the server but the server has not responded yet
         *
         * Cleared in game_started, its possible to receive this event before receiving the response of
         */
        self.placingBet = false;

        /** True if cashing out.. */
        self.cashingOut = false;

        /**
         * If a number, how much to bet next round
         * Saves the queued bet if the game is not 'game_starting', cleared in 'bet_placed' by us and 'game_started' and 'cancel bet'
         */
        self.nextBetAmount = null;

        /** Complements nextBetAmount queued bet with the queued autoCashOut */
        self.nextAutoCashout = null;

        /** Store the id of the timer to check for lag **/
        self.tickTimer = null;

        /** Tell if the game is lagging but only  when the game is in progress **/
        self.lag = false;

        /**
         * Event called at the moment when the game starts
         */
        self.ws.on('game_started', function(bets) {
            self.joined = [];

            self.gameState = 'IN_PROGRESS';
            self.startTime = Date.now();
            self.lastGameTick = self.startTime;
            self.placingBet = false;


            self.nextBetAmount = null;
            self.nextAutoCashout = null;

            Object.keys(bets).forEach(function(username) {
                if (self.username === username)
                    self.balanceSatoshis -= bets[username];

                self.playerInfo[username] = { bet: bets[username] };
            });

            self.trigger('game_started', self.playerInfo);
        });

        /**
         * Event called each 150ms telling the client the game is still alive
         * @param {object} data - JSON payload
         * @param {number} data.elapsed - Time elapsed since game_started
         */
        self.ws.on('game_tick', function(data) {
            /** Time of the last tick received */
            self.lastGameTick = Date.now();
            if(self.lag === true){
                self.lag = false;
                self.trigger('lag_change');
            }

            if(self.tickTimer)
                clearTimeout(self.tickTimer);

            self.tickTimer = setTimeout(self.checkForLag.bind(self), AppConstants.Engine.STOP_PREDICTING_LAPSE);
        });

        /** Socket io errors */
        self.ws.on('error', function(x) {
            console.log('on error: ', x);
            self.trigger('error', x);
        });

        /** Server Errors */
        self.ws.on('err', function(err) {
            console.error('Server sent us the error: ', err);
        });

        /**
         * Event called at game crash
         * @param {object} data - JSON payload
         * @param {number} data.elapsed - Total game elapsed time
         * @param {number} data.game_crash - Crash payout quantity in percent eg. 200 = 2x. Use this to calculate payout!
         * @param {object} data.bonuses - List of bonuses of each user, in satoshis
         * @param {string} data.seed - Revealed seed of the game
         */
        self.ws.on('game_crash', function(data) {

            if(self.tickTimer)
                clearTimeout(self.tickTimer);

            //Add the bonus to each user that wins it
            for (var user in data.bonuses) {
                console.assert(self.playerInfo[user]);
                self.playerInfo[user].bonus = data.bonuses[user];
                if (self.username === user) {
                    self.balanceSatoshis += data.bonuses[user];
                }
            }

            var gameInfo = {
                created: self.created,
                ended: true,
                game_crash: data.game_crash,
                game_id: self.gameId,
                hash: self.hash,
                player_info: self.playerInfo,
                seed: data.seed
            };

            //Add the current game info to the game history and if the game history is larger than 40 remove one element
            if (self.tableHistory.length >= 40)
                self.tableHistory.pop();
            self.tableHistory.unshift(gameInfo);

            //Clear current game properties
            self.gameState = 'ENDED';
            self.cashingOut = false;
            self.lag = false;

            self.trigger('game_crash', data);
        });

        /**
         * Event called before starting the game to let the client know when the game is going to start
         * @param {object} info - JSON payload
         * @param {number} info.game_id - The next game id
         * @param {number} info.hash - Provably predetermined hash
         * @param {number} info.time_till_start - Time lapse for the next game to begin
         */
        self.ws.on('game_starting', function(info) {
            self.playerInfo = {};
            self.joined = [];

            self.gameState = 'STARTING';
            self.gameId = info.game_id;
            self.hash = info.hash;
            self.startTime = new Date(Date.now() + info.time_till_start);


            // Every time the game starts checks if there is a queue bet and send it
            if (self.nextBetAmount) {
                self.doBet(self.nextBetAmount, self.nextAutoCashout, function(err) {
                    if(err)
                        console.log('Response from placing a bet: ', err);
                });
            }

            self.trigger('game_starting', info);
        });

        /**
         * Event called every time a user places a bet
         * the user that placed the bet could be me so we check for that
         * @param {object} resp - JSON payload
         * @param {string} resp.username - The player username
         * @param {number} resp.bet - The player bet in satoshis
         */
        self.ws.on('player_bet', function(data) {
            if (self.username === data.username) {
                self.placingBet = false;
                self.nextBetAmount = null;
                self.nextAutoCashout = null;
            }

            self.joined.splice(data.index, 0, data.username);

            self.trigger('player_bet', data);
        });

        /**
         * Event called every time the server cash out a user
         * if we call cash out the server is going to call this event
         * with our name.
         * @param {object} resp - JSON payload
         * @param {string} resp.username - The player username
         * @param {number} resp.stopped_at -The percentage at which the user cashed out
         */
        self.ws.on('cashed_out', function(resp) {
            //Add the cashout percentage of each user at cash out
            if (!self.playerInfo[resp.username])
                return console.warn('Username not found in playerInfo at cashed_out: ', resp.username);

            self.playerInfo[resp.username].stopped_at = resp.stopped_at;

            if (self.username === resp.username) {
                self.cashingOut = false;
                self.balanceSatoshis += self.playerInfo[resp.username].bet * resp.stopped_at / 100;
            }

            self.trigger('cashed_out', resp);
        });

        /**
         * Event called every time we receive a chat message
         * @param {object} resp - JSON payload
         * @param {string} time - Time when the message was sent
         * @param {string} type - The 'command': say, mute, error, info
         * @param {username} string - The username of who sent it
         * @param {role} string - admin, moderator, user
         * @param {message} string - Da message
         */
        self.ws.on('msg', function(data) {
            //The chat only renders if the Arr length is diff, remove blocks of the array
            if (self.chat.length > AppConstants.Chat.MAX_LENGTH)
                self.chat.splice(0, 400);
            self.chat.push(data);

            self.trigger('msg', data);
        });

        /** Triggered by the server to let users the have to reload the page */
        self.ws.on('update', function() {
            alert('Please refresh your browser! We just pushed a new update to the server!');
        });

        self.ws.on('connect', function() {

            requestOtt(function(err, ott) {
                if (err) {
                    /* If the error is 401 means the user is not logged in
                     * Todo: This will be fixed in the near future
                     */
                    if (err != 401) {
                        console.error('request ott error:', err);
                        if (confirm("An error, click to reload the page: " + err))
                            location.reload();
                        return;
                    }
                }

                self.ws.emit('join', { ott: ott },
                    function(err, resp) {
                        if (err) {
                            console.error('Error when joining the game...', err);
                            return;
                        }

                        self.balanceSatoshis = resp.balance_satoshis;
                        self.chat = resp.chat;

                        /** If username is a falsey value the user is not logged in */
                        self.username = resp.username;

                        /** Variable to check if we are connected to the server */
                        self.isConnected = true;
                        self.gameState = resp.state;
                        self.playerInfo = resp.player_info;

                        // set current game properties
                        self.gameId = resp.game_id;
                        self.hash = resp.hash;
                        self.created = resp.created;
                        self.startTime = new Date(Date.now() - resp.elapsed);
                        self.joined = resp.joined;
                        self.tableHistory = resp.table_history;

                        if (self.gameState == 'IN_PROGRESS')
                            self.lastGameTick = Date.now();

                        self.trigger('connected');
                    }
                );
            });
        });

        self.ws.on('disconnect', function(data) {
            self.isConnected = false;

            console.log('Client disconnected |', data, '|', typeof data);
            self.trigger('disconnected');
        });
    }

    /**
     * STOP_PREDICTING_LAPSE milliseconds after game_tick we put the game in lag state
     */
    Engine.prototype.checkForLag = function() {
        this.lag = true;
        this.trigger('lag_change');
    };

    /**
     * Sends chat message
     * @param {string} msg - String containing the message, should be longer than 1 and shorter than 500.
     */
    Engine.prototype.say = function(msg) {
        console.assert(msg.length > 1 && msg.length < 500);
        this.ws.emit('say', msg);
    };

    /**
     * Places a bet with a giving amount.
     * @param {number} amount - Bet amount in bits
     * @param {number} autoCashOut - Percentage of self cash out
     * @param {function} callback(err, result)
     */
    Engine.prototype.bet = function(amount, autoCashOut, callback) {
        console.assert(typeof amount == 'number');
        console.assert(Clib.isInteger(amount));
        console.assert(!autoCashOut || (typeof autoCashOut === 'number' && autoCashOut >= 100));

        if(!Clib.isInteger(amount) || !((amount%100) == 0))
            return console.error('The bet amount should be integer and divisible by 100');

        this.nextBetAmount = amount;
        this.nextAutoCashout = autoCashOut;

        if (this.gameState === 'STARTING')
            return this.doBet(amount, autoCashOut, callback);

        //otherwise, lets queue the bet
        if (callback)
            callback(null, 'WILL_JOIN_NEXT');

        this.trigger('bet_queued');
    };

    // Actually bet. Throw the bet at the server.
    Engine.prototype.doBet =  function(amount, autoCashOut, callback) {
        var self = this;

        self.placingBet = true;
        this.ws.emit('place_bet', amount, autoCashOut, function(error) {

            if (error) {
                console.warn('place_bet error: ', error);

                if (error !== 'GAME_IN_PROGRESS' && error !== 'ALREADY_PLACED_BET') {
                    alert('There was an error, please reload the window: ' + error);
                }
                if (callback)
                    callback(error);
                return;
            }

            self.trigger('bet_placed');

            if (callback)
                callback(null);
        });
        self.trigger('placing_bet');
    };

    /**
     * Cancels a bet, if the game state is able to do it so
     */
    Engine.prototype.cancelBet = function() {

        if (!this.nextBetAmount)
            return console.error('Can not cancel next bet, wasn\'t going to make it...');

        this.nextBetAmount = null;

        this.trigger('cancel_bet');
    };

    /**
     * Request the server to cash out
     * @param {function} callback - The callback to handle cash_out request errors
     */
    Engine.prototype.cashOut = function(callback) {
        var self = this;
        this.cashingOut = true;
        this.ws.emit('cash_out', function(error) { //TODO: Deprecate callback
            if (error) {
                console.warn('Cashing out error: ', error);
                if(callback)
                    return callback(error);
            }
            if(callback)
                return callback(null);
        });
        this.trigger('cashing_out');
    };

    /**
     * Returns the game payout as a percentage if game is in progress
     * if the game is not in progress returns null.
     *
     * Used by the script-controller
     *
     * If the last was time exceed the STOP_PREDICTING_LAPSE constant
     * It returns the last game tick elapsed time + the STOP_PREDICTING_LAPSE
     * This will cause the graph or others to stops if there is lag.
     * Only call this function if the game is 'IN_PROGRESS'.
     * Use it for render, strategy, etc.
     * @return {number}
     */
    Engine.prototype.getGamePayout = function() {
        if(!(this.gameState === 'IN_PROGRESS'))
            return null;

        if((Date.now() - this.lastGameTick) < AppConstants.Engine.STOP_PREDICTING_LAPSE) {
            var elapsed = Date.now() - this.startTime;
        } else {
            var elapsed = this.lastGameTick - this.startTime + AppConstants.Engine.STOP_PREDICTING_LAPSE; //+ STOP_PREDICTING_LAPSE because it looks better
        }
        var gamePayout = Clib.growthFunc(elapsed);
        console.assert(isFinite(gamePayout));
        return gamePayout;
    };

    /**
     * Returns the remaining time fot the next game to begin
     * Can only be called when the game is STARTING
     *
     * @return {number} - Estimated miliseconds till game starts
     */
    //Engine.prototype.nextGameIn = function() { //Todo: Deprecated
    //    console.assert(this.gameState === 'STARTING');
    //    return Math.max(this.startTime - Date.now(), 0);
    //};

    /**
     * Calculate and returns the game payout as a percentage given the elapsed time
     * Use it for render, strategy, etc.
     * @return {number | null}
     */
    //Engine.prototype.calcGamePayout = function(ms) { //Todo: Deprecated
    //    return growthFunc(ms);
    //};

    // is either queuing up a bet, placing a bet, or placed a bet
    //Engine.prototype.isBetting = function() { //Todo: Deprecated
    //    if (!this.username) return false;
    //
    //    if (this.nextBetAmount) return true;
    //
    //    for (var i = 0 ; i < this.joined.length; ++i) {
    //        if (this.joined[i] == this.username)
    //            return true;
    //    }
    //
    //    return false;
    //};

    //Engine.prototype.currentPlay = function() { //Todo: Deprecated
    //    if (!this.username) return null;
    //
    //    return this.playerInfo[this.username];
    //};

    /**
     * Returns the elapsed time of the current game
     * If the game is not in progress returns null
     * Use it for render, strategy, etc.
     * @return {number | null}
     */
    //Engine.prototype.getElapsedTime = function() { //Todo: Deprecated
    //    if (this.gameState === 'IN_PROGRESS') {
    //        return Date.now() - this.startTime;
    //    } else {
    //        return null;
    //    }
    //};

    /**
     * Function to request the one time token to the server
     */
    function requestOtt(callback) {

        try {
            var ajaxReq  = new XMLHttpRequest();

            if(!ajaxReq)
                throw new Error("Your browser doesn't support xhr");

            ajaxReq.open("POST", "/ott", true);
            ajaxReq.setRequestHeader('Accept', 'text/plain');
            ajaxReq.send();

        } catch(e) {
            console.error(e);
            alert('Requesting token error: ' + e);
            location.reload();
        }

        ajaxReq.onload = function() {
            if (ajaxReq.status == 200) {
                var response = ajaxReq.responseText;
                callback(null, response);

            } else if (ajaxReq.status == 401) {
                callback(ajaxReq.status);
            } else callback(ajaxReq.responseText);
        }
    }

    //Singleton Engine
    return new Engine();
});
