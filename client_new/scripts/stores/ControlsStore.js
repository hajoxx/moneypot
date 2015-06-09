define([
    'dispatcher/AppDispatcher',
    'constants/AppConstants',
    'lib/events',
    'lodash',
    'game-logic/clib'
], function(
    AppDispatcher,
    AppConstants,
    Events,
    _,
    Clib
){
    var CHANGE_EVENT = 'change';

    var _betSize = '1';
    var _betInvalid = false;
    var _cashOut = '2.00';
    var _cashOutInvalid = false;

    //Singleton ControlsStore Object
    var ControlsStore = _.extend({}, Events, {

        emitChange: function() {
            this.trigger(CHANGE_EVENT);
        },

        addChangeListener: function(callback) {
            this.on(CHANGE_EVENT, callback);
        },

        removeChangeListener: function(callback) {
            this.off(CHANGE_EVENT, callback);
        },

        _setBetSize: function(betSize) {
            _betSize = betSize;

            var bet = Clib.parseBet(betSize);
            if(bet instanceof Error)
                _betInvalid = bet.message;
            else
                _betInvalid = false;
        },

        _setAutoCashOut: function(autoCashOut) {
            _cashOut = autoCashOut;

            var co = Clib.parseAutoCash(autoCashOut);
            if(co instanceof Error)
                _cashOutInvalid = co.message;
            else
                _cashOutInvalid = false;
        },

        getBetSize: function() {
            return _betSize;
        },

        getBetInvalid: function() {
            return _betInvalid;
        },

        getCashOut: function() {
            return _cashOut;
        },

        getCashOutInvalid: function() {
            return _cashOutInvalid;
        }

    });

    AppDispatcher.register(function(payload) {
        var action = payload.action;

        switch(action.actionType) {
            case AppConstants.ActionTypes.SET_BET_SIZE:
                ControlsStore._setBetSize(action.betSize);
                ControlsStore.emitChange();
                break;
            case AppConstants.ActionTypes.SET_AUTO_CASH_OUT:
                ControlsStore._setAutoCashOut(action.autoCashOut);
                ControlsStore.emitChange();
                break;
        }

        return true; // No errors. Needed by promise in Dispatcher.
    });

    return ControlsStore;
});