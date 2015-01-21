/**
 * This is the connection between the flux interface and the engine,
 * given that the engine holds pretty much the hole state of the game
 * this file receives the flux actions targeting the engine and call it.
 *
 * Every time the engine change its state we trigger a flux change event
 * that will re render every component listening to this virtual store.
 */

define([
    'game-logic/engine',
    'lib/events',
    'dispatcher/AppDispatcher',
    'constants/AppConstants',
    'lib/clib'
], function(
    Engine,
    Events,
    AppDispatcher,
    AppConstants,
    Clib
){

    var CHANGE_EVENT = 'change';

    //Singleton Store Object
    var EngineVirtualStore = _.extend({}, Events, {

        emitChange: function() {
            this.trigger(CHANGE_EVENT);
        },

        addChangeListener: function(fn) {
            this.on(CHANGE_EVENT, fn);
        },

        removeChangeListener: function(fn) {
            this.off(CHANGE_EVENT, fn);
        },

        _placeBet: function(bet, cashOut) {
            Engine.bet(bet, cashOut);
        },

        _cancelBet: function() {
            Engine.cancelBet();
        },

        _cashOut: function() {
            Engine.cashOut();
        },

        _sayChat: function(msg) {
            Engine.say(msg);
        },

        getState: function() {

            /** To Know if the user is betting **/
            function isBetting() {
                if (!Engine.username) return false;
                if (Engine.nextBetAmount) return true;
                for (var i = 0 ; i < Engine.joined.length; ++i) {
                    if (Engine.joined[i] == Engine.username)
                        return true;
                }
                return false;
            }

            /** If the user is currently playing return and object with the status else null **/
            var currentPlay;
            if (!Engine.username)
                currentPlay = null;
            else
                currentPlay = Engine.playerInfo[Engine.username];

            var currentlyPlaying = currentPlay && currentPlay.bet && !currentPlay.stopped_at;

            return {
                //Raw states
                gameState: Engine.gameState,
                startTime: Engine.startTime,
                currentTime: Engine.currentTime,
                playerInfo: Engine.playerInfo,
                tableHistory: Engine.tableHistory,
                username: Engine.username,
                isConnected: Engine.isConnected,
                lastHash: Engine.lastHash,
                nextBetAmount: Engine.nextBetAmount,
                nextAutoCashout: Engine.nextAutoCashout,
                joined: Engine.joined,
                chat: Engine.chat,
                balanceSatoshis: Engine.balanceSatoshis,
                gameId: Engine.gameId,
                lag: Engine.lag,
                lastGameTick: Engine.lastGameTick,

                maxWin: Engine.maxWin,

                //Helper States
                isBetting: isBetting(),
                currentPlay: currentPlay, //If the user is currently playing return and object with the status else null
                currentlyPlaying: currentlyPlaying //True if you are playing and haven't cashed out
            }
        }

    });

    /**
     * Here is the virtual part: we listen every event of the engine
     * and update the state of the store unlike flux where only actions
     * can alter the state of the stores.
     */
    Engine.on('all', function(eventName) {
        EngineVirtualStore.emitChange();
    });

    /**
     * Here is the other virtual part of the store:
     * The actions created by flux views are converted
     * to calls to the engine which will case changes there
     * and they will be reflected here through the event listener
     */
    AppDispatcher.register(function(payload) {
        var action = payload.action;

        switch(action.actionType) {

            case AppConstants.ActionTypes.PLACE_BET:
                EngineVirtualStore._placeBet(action.bet, action.cashOut);
                break;

            case AppConstants.ActionTypes.CANCEL_BET:
                EngineVirtualStore._cancelBet();
                break;

            case AppConstants.ActionTypes.CASH_OUT:
                EngineVirtualStore._cashOut();
                break;

            case AppConstants.ActionTypes.SAY_CHAT:
                EngineVirtualStore._sayChat(action.msg);
                break;

        }

        return true; // No errors. Needed by promise in Dispatcher.
    });

    return EngineVirtualStore;
});