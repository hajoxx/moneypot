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

    var _themeFileName = '/css/' + (window.THEME_FILE_NAME || 'blackTheme.css'); //Global var sent by the server

    var _currentTheme = Clib.localOrDef('currentTheme', 'white'); //black || white

    if(localStorage['currentTheme'] === 'black')
        Clib.loadCss(_themeFileName, 'theme-black');

    //Singleton ControlsStore Object
    var GameSettingsStore = _.extend({}, Events, {

        emitChange: function() {
            this.trigger(CHANGE_EVENT);
        },

        addChangeListener: function(callback) {
            this.on(CHANGE_EVENT, callback);
        },

        removeChangeListener: function(callback) {
            this.off(CHANGE_EVENT, callback);
        },

        _toggleTheme: function() {
            if(_currentTheme === 'white') {
                Clib.loadCss(_themeFileName, 'theme-black');
                _currentTheme = 'black';
            } else {
                Clib.removeCss('theme-black');
                _currentTheme = 'white';
            }
            localStorage['currentTheme'] = _currentTheme;
        },

        getCurrentTheme: function() {
            return _currentTheme
        }

    });

    AppDispatcher.register(function(payload) {
        var action = payload.action;

        switch(action.actionType) {

            case AppConstants.ActionTypes.TOGGLE_THEME:
                GameSettingsStore._toggleTheme();
                GameSettingsStore.emitChange();
                break;
        }

        return true; // No errors. Needed by promise in Dispatcher.
    });

    return GameSettingsStore;
});