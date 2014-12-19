define([
    'dispatcher/AppDispatcher',
    'constants/AppConstants'
], function(
    AppDispatcher,
    AppConstants
){

    var ChatActions = {

        say: function(msg){
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.SAY_CHAT,
                msg: msg
            });
        },

        updateInputText: function(text) {
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.SET_CHAT_INPUT_TEXT,
                text: text
            });
        }

    };

    return ChatActions;
});