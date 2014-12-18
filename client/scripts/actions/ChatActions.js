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
        }

    };

    return ChatActions;
});