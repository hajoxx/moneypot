define([
    'lib/lodash',
    'lib/events',
    'dispatcher/AppDispatcher'
], function(
    _,
    Events,
    AppDispatcher
) {

    var CHANGE_EVENT = 'change';


    var _chatInput = '';


    var ChatStore = _.extend({}, Events, {

        addEventListener: function(fn) {
            this.on(CHANGE_EVENT, fn);
        },

        removeEventListener: function(fn) {
            this.off(CHANGE_EVENT, fn);
        },

        setChatInput: function(message) {

        },

        getState: function() {
            return {
                chatInput: _chatInput
            }
        }
    });


    return ChatStore;
});