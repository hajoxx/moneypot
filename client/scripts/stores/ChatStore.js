define([
    'lib/lodash',
    'lib/events',
    'constants/AppConstants',
    'dispatcher/AppDispatcher'
], function(
    _,
    Events,
    AppConstants,
    AppDispatcher
) {

    var CHANGE_EVENT = 'change';


    var _inputText = '';


    var ChatStore = _.extend({}, Events, {

        emitChange: function() {
            this.trigger(CHANGE_EVENT);
        },

        addChangeListener: function(fn) {
            this.on(CHANGE_EVENT, fn);
        },

        removeChangeListener: function(fn) {
            this.off(CHANGE_EVENT, fn);
        },

        _setInputText: function(message) {
            _inputText = message;
        },

        _clearInputText: function() {
            _inputText = '';
        },

        getState: function() {
            return {
                inputText: _inputText
            }
        }
    });


    AppDispatcher.register(function(payload) {
        var action = payload.action;

        switch(action.actionType) {
            case AppConstants.ActionTypes.SET_CHAT_INPUT_TEXT:
                ChatStore._setInputText(action.text);
                ChatStore.emitChange();
                return;

            case AppConstants.ActionTypes.SAY_CHAT:
                ChatStore._clearInputText();
                ChatStore.emitChange();
                return;
        }

        return true; // No errors. Needed by promise in Dispatcher.
    });


    return ChatStore;
});