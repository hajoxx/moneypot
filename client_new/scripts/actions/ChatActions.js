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

        ignoreUser: function(username) {
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.IGNORE_USER,
                username: username
            });
        },

        approveUser: function(username) {
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.APPROVE_USER,
                username: username
            });
        },

        showClientMessage: function(message) {
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.CLIENT_MESSAGE,
                message: message
            });
        },

        listMutedUsers: function(ignoredClientList) {
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.LIST_MUTED_USERS,
                ignoredClientList: ignoredClientList
            });
        },

        selectChannel: function(channelName) {
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.JOIN_CHANNEL,
                channelName: channelName
            });
        },

        closeCurrentChannel: function() {
            AppDispatcher.handleViewAction({
                actionType: AppConstants.ActionTypes.CLOSE_CURRENT_CHANNEL
            });
        }

    };

    return ChatActions;
});