define(['lib/events', 'lib/lodash'], function(Events, _) {

    var EngineProxy = function (engine, stopEngine) {
        _.extend(this, Events);

        this.engine = engine;
        this.stopEngine = stopEngine;
    };

    EngineProxy.prototype.localStop = function() {
        var self = this;

        this.events.forEach(function(pair) {
            var eventName = pair[0];
            var fn = pair[1];

            self.engine.off(eventName, fn);
        });
    };

    /* ==========================================================================
     Game State Events
     ========================================================================== */

    /**
     * 'game_starting': Event called before starting the game to let the client know when the game is going to start
     * @param {object} info - JSON payload
     * @param {number} info.game_id - The next game id
     * @param {number} info.hash - Provably predetermined hash
     * @param {number} info.time_till_start - Time lapse for the next game to begin
     */

    /**
     * 'game_started': Event called at the moment when the game starts
     * @param {object} data - JSON payload
     * @param {object} data['username'] - Contains each user bet
     * @param {number} data['username].bet - The bet of the user this game
     */

    /**
     * 'game_crash': Event called at game crash
     * @param {object} data - JSON payload
     * @param {number} data.elapsed - Total game elapsed time
     * @param {number} data.game_crash - Crash payout quantity in percent eg. 200 = 2x. Use this to calculate payout!
     * @param {object} data.bonuses - List of bonuses of each user, in satoshis
     * @param {string} data.seed - Revealed seed of the game
     */

    /* ==========================================================================
     Player Events
     ========================================================================== */

    /**
     * 'player_bet': Event called every time a user places a bet
     * the user that placed the bet could be me so we check for that
     * @param {object} resp - JSON payload
     * @param {string} resp.username - The player username
     * @param {number} resp.bet - The player bet in satoshis
     */

    /**
     * 'cashed_out': Event called every time the server cash out a user
     * if we call cash out the server is going to call this event
     * with our name.
     * @param {object} resp - JSON payload
     * @param {string} resp.username - The player username
     * @param {number} resp.amount - The amount the user cashed out
     * @param {number} resp.stopped_at -The percentage at which the user cashed out
     */

    /* ==========================================================================
     Chat Events
     ========================================================================== */

    /**
     * 'msg': Event called every time we receive a chat message
     * @param {object} resp - JSON payload
     * @param {string} time - Time when the message was sent
     * @param {string} type - The 'command': say, mute, error, info
     * @param {username} string - The username of who sent it
     * @param {role} string - admin, moderator, user
     * @param {message} string - Da message
     */

    /* ==========================================================================
     Connection Events
     ========================================================================== */

    /**
     * 'connected': The engine is connected to the server
     */

    /**
     * 'disconnected': The engine is disconnected to the server
     */


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
     * Gets the maximum amount you can bet per game
     */
    EngineProxy.prototype.getMaxBet = function() {
        return this.engine.maxBet;
    };

    /**
     * Gets the current game payout if playing,
     * if the game is not in progress returns null
     */
    EngineProxy.prototype.getCurrentPayout = function() {
        return this.engine.getGamePayout();
    };

    /**
     * Returns the username of the user or null
     */
    EngineProxy.prototype.getUsername = function() {
        return this.engine.username;
    };


    /* ==========================================================================
     Helpers
     ========================================================================== */

    /**
     * Returns 'WON', 'LOST', 'NOT_PLAYED' based on your game history
     */
    EngineProxy.prototype.lastGamePlay = function() {
        if(this.lastGamePlayed())
            if(this.engine.tableHistory[0].player_info[this.engine.username].stopped_at)
                return 'WON';
            else
                return 'LOST';

        return 'NOT_PLAYED';
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
    EngineProxy.prototype.placeBet = function(bet, cashOut, callback) {
        this.engine.bet(bet, cashOut, callback);
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

    /**
     * Say something in the chat, from 1 to 500 chars
     */
    EngineProxy.prototype.chat = function(msg) {
        this.engine.say(msg);
    };

    return EngineProxy;
});
