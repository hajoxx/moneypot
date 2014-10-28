define(['lib/events', 'lib/clib', 'lib/lodash'], function(Events, Clib, _) {

    var EngineProxy = function (engine, stopEngine) {
        var self = this;

        self.engine = engine;
        self.stopEngine = stopEngine;
    };

    EngineProxy.prototype.localStop = function() {
        var self = this;
        Object.keys(this.events).forEach(function(key) {
            self.engine.off(key, self.events[key]);
        });
    };

    //EngineProxy.prototype.stopEngine = function() {
    //    this.localStop(this);
    //};

    /* ==========================================================================
     Events
     ========================================================================== */

    /**
     * Event called before starting the game to let the client know when the game is going to start
     * @param {object} info - JSON payload
     * @param {number} info.game_id - The next game id
     * @param {number} info.hash - Provably predetermined hash
     * @param {number} info.time_till_start - Time lapse for the next game to begin
     */
    EngineProxy.prototype.onGameStarting = function(info) { };

    /**
     * Event called at the moment when the game starts
     */
    EngineProxy.prototype.onGameStarted = function() { };

    /**
     * Event called at game crash
     * @param {object} data - JSON payload
     * @param {number} data.elapsed - Total game elapsed time
     * @param {number} data.game_crash - Crash payout quantity in percent eg. 200 = 2x. Use this to calculate payout!
     * @param {object} data.bonuses - List of bonuses of each user, in satoshis
     * @param {string} data.seed - Revealed seed of the game
     */
    EngineProxy.prototype.onGameCrash = function(data) { };

    /**
     * Event called every time a user places a bet
     * the user that placed the bet could be me so we check for that
     * @param {object} resp - JSON payload
     * @param {string} resp.username - The player username
     * @param {number} resp.bet - The player bet in satoshis
     */
    EngineProxy.prototype.onUserBet = function(data) { };

    /**
     * Event called every time the server cash out a user
     * if we call cash out the server is going to call this event
     * with our name.
     * @param {object} resp - JSON payload
     * @param {string} resp.username - The player username
     * @param {number} resp.amount - The amount the user cashed out
     * @param {number} resp.stopped_at -The percentaje at wich the user cashed out
     */
    EngineProxy.prototype.onCashedOut = function(resp) { };

    /**
     * The cant be place right now so we queue it for
     * when the game_starting event happens
     */
    EngineProxy.prototype.onBetQueued = function() { };

    /**
     * A queued bet was canceles
     */
    EngineProxy.prototype.onCancelBet = function() { };

    /**
     * A bet was placed
     */
    EngineProxy.prototype.onBetPlaced = function() { };

    /**
     * Event called every time a user places a bet
     * the user that placed the bet could be me so we check for that
     * @param {object} resp - JSON payload
     * @param {string} resp.username - The player username
     * @param {number} resp.bet - The player bet in satoshis
     */
    EngineProxy.prototype.onPlayerBet = function(data) { };

    /**
     * Event called every time the server cash out a user
     * if we call cash out the server is going to call this event
     * with our name.
     * @param {object} resp - JSON payload
     * @param {string} resp.username - The player username
     * @param {number} resp.amount - The amount the user cashed out
     * @param {number} resp.stopped_at -The percentaje at wich the user cashed out
     */
    EngineProxy.prototype.onUserCashedOut = function(resp) { };

    /**
     * Event called every time we receive a chat message
     * @param {object} resp - JSON payload
     * @param {string} time - Time when the message was sended
     * @param {string} type - The 'command': say, mute, error, info
     * @param {username} string - The username of who sent it
     * @param {role} string - admin, moderator, user
     * @param {message} string - Da message
     */
    EngineProxy.prototype.onChatMsg = function(data) { };

    /**
     * The engine is connected to the server
     */
    EngineProxy.prototype.onConnected = function() { };

    /**
     * The engine is disconnected to the server
     */
    EngineProxy.prototype.onDisconnected = function() { };


    /* ==========================================================================
     Getters
     ========================================================================== */

    /**
     * Gets the current balance
     */
    EngineProxy.prototype.getBalance = function() {
        return this.engine.balanceSatoshis;
    };

    /**
     * Gets the current game payout if playing,
     * if the game is not in progress returns null
     */
    EngineProxy.prototype.getCurrentGamePayout = function() {
      return this.engine.getGamePayout();
    };


    /* ==========================================================================
     Helpers
     ========================================================================== */

    /**
     * Returns true if the last game was played and lost, false other way
     */
    EngineProxy.prototype.lastGameWasLost = function() { //null means not last winnings(lost) and
        if(this.lastGamePlayed())
            return !this.engine.tableHistory[0].player_info[this.engine.username].stopped_at;

        return false; //Cant lose if not played
    };

    /**
     * Returns true if the last game was played
     */
    EngineProxy.prototype.lastGamePlayed = function() {
        return !!this.engine.tableHistory[0].player_info[this.engine.username];
    };


    /* ==========================================================================
     Actions
     ========================================================================== */

    /**
     * Place a bet
     * @param {number} bet - The amount to bet in satoshis
     * @param {number} cashOut - Auto cash at this multiplier
     * @param {boolean} autoplay - True to bet automatically with the current settings
     * @param {function} callback - Optional callback to catch errors
     */
    EngineProxy.prototype.placeBet = function(bet, cashOut, autoplay, callback) {
        this.engine.bet(bet, cashOut, autoplay, callback);
    };

    /**
     * Cash out, only when playing.
     * @param callback - callback to catch errors
     */
    EngineProxy.prototype.cashOut = function(callback) {
        this.engine.cashOut(callback);
    };

    /**
     * Stop disconnects from receiving all events. Once stop is called,
     * there is no reconnecting
     */
    EngineProxy.prototype.stop = function() {
        this.stopEngine();
    };

    return EngineProxy;
});