define(['lib/socket.io-1.1.0', 'lib/events', 'lib/lodash', 'lib/clib'], function(io, Events, _, Clib) {

    var defaultHost = window.document.location.host === 'www.moneypot.com' ?
        'https://game.moneypot.com' :
        window.document.location.host.replace(/:3841$/, ':3842');

    console.log('Connecting to: ', defaultHost);
    
    var TICK_LAG_LAPSE = 600;
    var STOP_PREDICTING_LAPSE = 300;

    //TODOS:
        //Lag


    // Engine inherits from BackBone events:
    // http://backbonejs.org/#Events
    // which means it has events like .on, off, .trigger, .once, .listenTo, .stopListening
    function Engine() {
        var self = this;

        _.extend(this, Events);

        self.ws = io(defaultHost);

        /** The engine is connected to the server, if not connected, all fields are unreadable */
        self.isConnected = false;

        /** The username or null if is not logged in */
        self.username = null;

        /** The balance of the user */
        self.balanceSatoshis = null;

        /** Array containing chat history */
        self.chat = null;

        /** Object containig the game history */
        self.tableHistory = null;

        /** Object containing the current game players and their status, this is saved in game history every game crash */
        self.playerInfo = null;

        /**
         * The state of the game
         * Posible states: IN_PROGRESS, ENDED, STARTING
         */
        self.gameState = null;

        /**
         * User state
         * Posible states: 'WATCHING'  || 'PLAYING'
         * WATCHING: Just watching the game
         * PLAYING: Bet in the current game
        */
        self.userState = null;

        self.created = null; // Creation time of current game. This is the server time, not clients..

        /** The game id of the current game */
        self.gameId = null;

        // if the game is pending, startTime is how long till it starts
        // if the game is running, startTime is how long its running for
        /// if the game is ended, startTime is how long since the game started
        self.startTime = null;


        /** True if you send place_bet to the server but the server has not yet responded */
        self.placingBet = false;

        self.autoPlay = false;

        /** True if cashing out.. */
        self.cashingOut = false;


        self.nextBetAmount = null; // If a number, how much to bet next round
        self.nextAutoCashout = 0;

        // Terrible prefix name, last means the 'current' game

        /** Player's Last bet in satoshis **/
        self.lastBet = null;

        self.lastGameWonAmount = null; // satoshis won in last game
        self.lastGameCrashedAt = false; //  The percentage in which the last game crashed at
        self.lastBonus = null;        // satoshis of the last bonus earned

        self.ws.on('err', function(err) {
            console.error('Server sent us the error: ', err);
        });

        /**
         * Event called at the moment when the game starts
         */
        self.ws.on('game_started', function() {

            self.gameState = 'IN_PROGRESS';
            self.startTime = Date.now(); // TODO: This date will be sent by the server in the near future
            self.lastGameTick = self.startTime;

            if (!self.autoPlay) {
                self.nextBetAmount = null;
                self.nextAutoCashout = null;
            }

            self.trigger('game_started');

        });

        /**
         * Event called each 150ms telling the client the game is still alive
         * @param {object} data - JSON payload
         * @param {number} data.elapsed - Time elapsed since game_started
         */
        self.ws.on('game_tick', function(data) {
            /** Time of the last tick received */
            self.lastGameTick = Date.now(); //TODO: To use self.startTime + data.elapsed we need to have the startTime from the server

        });

        self.ws.on('error', function(x) {
            console.log('on error: ', x);
            self.trigger('error', x);
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
            self.lastGameCrashedAt = data.game_crash;
            self.lastBonus = self.playerInfo[self.username] ? self.playerInfo[self.username].bonus : null;
            self.userState = 'WATCHING';

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

            self.gameState = 'STARTING';
            self.gameId = info.game_id;
            self.hash = info.hash;
            self.startTime = new Date(Date.now() + info.time_till_start);

            self.lastBet = null;
            self.lastGameWonAmount = null;
            self.lastGameCrashedAt = null;
            self.lastBonus = null;

            /** Clear the users playing object */
            self.playerInfo = {};

            //Everytime the game starts checks if there is a queue bet and send it
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
                self.userState = 'PLAYING';
                self.balanceSatoshis -= data.bet;
                self.lastBet = data.bet;
                self.trigger('user_bet', data);
            }

            self.playerInfo[data.username] = { bet: data.bet };
            self.trigger('player_bet', data);
        });

        /**
         * Event called every time the server cash out a user
         * if we call cash out the server is going to call this event
         * with our name.
         * @param {object} resp - JSON payload
         * @param {string} resp.username - The player username
         * @param {number} resp.amount - The amount the user cashed out
         * @param {number} resp.stopped_at -The percentaje at wich the user cashed out
         */
        self.ws.on('cashed_out', function(resp) {
            if (self.username === resp.username) {
                self.lastGameWonAmount = resp.amount;
                self.balanceSatoshis += resp.amount;
                self.userState = 'WATCHING';
                self.trigger('user_cashed_out', resp);
            }

            //Add the cashout percetage of each user at cash out
            if (!self.playerInfo[resp.username])
                return console.warn('Username not found in playerInfo at cashed_out: ', resp.username);

            self.playerInfo[resp.username].stopped_at = resp.stopped_at;
            self.playerInfo[resp.username].amount = resp.amount;

            self.trigger('cashed_out', resp);
        });

        /**
         * Event called every time we receive a chat message
         * @param {object} resp - JSON payload
         * @param {string} time - Time when the message was sended
         * @param {string} type - The 'command': say, mute, error, info
         * @param {username} string - The username of who sent it
         * @param {role} string - admin, moderator, user
         * @param {message} string - Da message
         */
        self.ws.on('msg', function(data) {
            //The chat only renders if the Arr length is diff, remove blocks of the array
            if (self.chat.length > 500)
                self.chat.splice(0, 400);
            self.chat.push(data);

            console.log(data);

            self.trigger('msg', data);
        });

        self.ws.on('update', function() {
            alert('Please refresh your browser! We just pushed a new update to the server!');
        });


        self.ws.on('connect', function() {

            requestOtt(function(err, ott) {
                if (err) {
                    /* If the error is 401 means the user is not logged in
                     * This will be fixed in the near future
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
                        self.userState =
                            self.playerInfo[self.username] &&
                            !self.playerInfo[self.username].stopped_at
                                ? 'PLAYING' : 'WATCHING';
                        if(self.userState === 'PLAYING')
                            self.lastBet = self.playerInfo[self.username].bet;

                        // set current game properties
                        self.gameId = resp.game_id;
                        self.hash = resp.hash;
                        self.created = resp.created;
                        self.startTime = new Date(Date.now() - resp.elapsed);

                        self.tableHistory = resp.table_history;

                        if (self.gameState == 'IN_PROGRESS')
                            self.lastGameTick = Date.now();

                        if (self.gameState == 'ENDED')
                            self.lastGameCrashedAt = resp.crashed_at;

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
     * Sends chat message
     * @param {string} msg - String containing the message, should be longer than 1 and shorter than 500.
     */
    Engine.prototype.say = function(msg) {
        console.assert(msg.length > 1 && msg.length < 500);
        this.ws.emit('say', msg);
    };

    /**
     * Returns the remaining time fot the next game to begin
     * Can only be called when the game is STARTING
     *
     * @return {number} - Estimated miliseconds till game starts
     */
    Engine.prototype.nextGameIn = function() {
        console.assert(this.gameState === 'STARTING');
        return Math.max(this.startTime - Date.now(), 0);
    };

    /**
     * Places a bet with a giving amount.
     * @param {number} amount - Bet amount in bits
     * @param {number} autoCashOut - Percentage of self cash outf
     * @param {function} callback(err, result)
     */
    Engine.prototype.bet = function(amount, autoCashOut, autoPlay, callback) {
        console.assert(typeof amount == 'number');
        console.assert(Clib.isInteger(amount));
        console.assert(!autoCashOut || (typeof autoCashOut === 'number' && autoCashOut >= 100));

        this.autoPlay = autoPlay;
        this.nextBetAmount = amount;
        this.nextAutoCashout = autoCashOut;

        if (this.gameState === 'STARTING')
            return this.doBet(amount, autoCashOut, callback);


        // otherwise, lets queue the bet...
        callback(null, 'WILL_JOIN_NEXT');
        this.trigger('bet_queued');
    };

    // Actually bet. Throw the bet at the server.
    // autoC
    Engine.prototype.doBet =  function(amount, autoCashOut, callback) {
        var self = this;
        this.ws.emit('place_bet', amount, autoCashOut, function(error) {

            if (error) {
                console.warn('place_bet error: ', error);

                if (error !== 'GAME_IN_PROGRESS' && error !== 'ALREADY_PLACED_BET') {
                    alert('There was an error, please reload the window: ' + error);
                    self.autoPlay = false;
                }
                if (callback)
                    callback(error);
                return;
            }

            self.trigger('bet_placed');
            if (callback)
                callback(null);
        });
    };

    Engine.prototype.cancelAutoPlay = function() {
        this.autoPlay = false;
    };

     /**
      * Cancels a bet, if the game state is able to do it so
      */
    Engine.prototype.cancelBet = function() {
        this.autoPlay = false;

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
        this.ws.emit('cash_out', function(error) {
            self.cashingOut = false;
            if (error) {
                console.warn('Cashing out error: ', error);
            }

            callback(error);
        });

    };

    /**
     * Returns the game payout as a percentage if game is in progress
     * if the game is not in progress returns null.
     * 
     * If the last was time exceed the STOP_PREDICTING_LAPSE constant
     * It returns the last game tick elpased time + the STOP_PREDICTING_LAPSE
     * This will cause the graph or others to stops if there is lag.
     * Only call this function if the game is 'IN_PROGRESS'.
     * Use it for render, strategy, etc.
     * @return {number}
     */
    Engine.prototype.getGamePayout = function() {
        if(!(this.gameState === 'IN_PROGRESS'))
            return null;

        if((Date.now() - this.lastGameTick) < STOP_PREDICTING_LAPSE) {
            var elapsed = Date.now() - this.startTime;
        } else {
            var elapsed = this.lastGameTick - this.startTime + STOP_PREDICTING_LAPSE;
        }
        var gamePayout = growthFunc(elapsed);
        console.assert(isFinite(gamePayout));
        return gamePayout;
    };

    /**
     * Calculate and returns the game payout as a percentage given the elapsed time
     * Use it for render, strategy, etc.
     * @return {number | null}
     */
    Engine.prototype.calcGamePayout = function(ms) {
         return growthFunc(ms);
    };

    /**
     * Returns the elapsed time of the current game
     * If the game is not in progress returns null
     * Use it for render, strategy, etc.
     * @return {number | null}
     */
    Engine.prototype.getElapsedTime = function() {
        if (this.gameState === 'IN_PROGRESS') {
            return Date.now() - this.startTime;
        } else {
            return null;
        }
    };

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

    function growthFunc(ms) {
        console.assert(typeof ms == 'number' && ms >= 0);
        var r = 0.00006;
        return Math.floor(100 * Math.pow(Math.E, r * ms)) / 100;
    }


    return Engine;
});
