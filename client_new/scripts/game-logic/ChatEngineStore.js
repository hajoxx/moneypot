define([
    'socketio',
    'lib/events',
    'game-logic/clib',
    'game-logic/ChannelManager',
    'constants/AppConstants',
    'dispatcher/AppDispatcher'
], function(
    io,
    Events,
    Clib,
    ChannelManager,
    AppConstants,
    AppDispatcher
) {

    var CHANGE_EVENT = 'change';

    function Chat() {
        var self = this;

        /**
         * Chat inherits from BackBone events:
         * http://backbonejs.org/#Events
         * which means it has events like .on, off, .trigger, .once, .listenTo, .stopListening
         */
        _.extend(this, Events);

        self.ws = io(AppConstants.Engine.CHAT_HOST);

        self.height = 253;

        /** How to display the bots on the chat **/
        self.botsDisplayMode = Clib.localOrDef('botsDisplayMode', 'normal'); //normal || greyed || none

        /**
         * States of the chat:
         *  DISCONNECTED: Socket.io is trying to establish a connection
         *  CONNECTED: The socket connection is established and we are connecting to a channel
         *  JOINED: Currently connected to a channel
         */
        self.connectionState = 'CONNECTING'; //CONNECTING || JOINING || JOINED || DISCONNECTED

        /** Username, if it is false the user is a guest **/
        self.username = null;

        /** Flag true if the user is a moderator or an admin **/
        self.moderator = null;

        /** Channel manager **/
        self.channelManager = new ChannelManager();

        /**
         * Event called every time we receive a chat message
         * @param {object} resp - JSON payload
         * @param {string} time - Time when the message was sent
         * @param {string} type - The 'command': say, mute, error, info
         * @param {username} string - The username of who sent it
         * @param {role} string - admin, moderator, user
         * @param {message} string - Da message
         */
        self.ws.on('msg', function(data) {

            self.channelManager.insertMessage(data.channelName, data, function(err) {
                if(err) {
                    if(err === 'CHANNEL_DOES_NOT_EXIST')
                        return console.error('[Chat] Received a message from a chanel we are not listening: ', data.channelName);
                    return console.error('[Chat] ', err);
                }

                //If @username in message ring
                var r = new RegExp('@' + self.username + '(?:$|[^a-z0-9_\-])', 'i');
                if (data.type === 'say' && data.username !== self.username && r.test(data.message))
                    new Audio('/sounds/gong.mp3').play();

                self.trigger('msg', data);
            });
        });

        /** Socket io errors */
        self.ws.on('error', function(x) {
            console.log('on error: ', x);
            self.trigger('error', x);
        });

        /** Server Errors */
        self.ws.on('err', function(err) {
            console.error('Server sent us the error: ', err);
        });

        /** Socket io is connected to the server **/
        self.ws.on('connect', function() {
            self.connectionState = 'JOINING';
            self.ws.emit('join', self.channelManager.getSavedChannels(), self.onJoin.bind(self));
            self.trigger('joining');
        });

        self.ws.on('disconnect', function(data) {
            self.connectionState = 'DISCONNECTED';
            self.trigger('disconnected');
        });
    }


    Chat.prototype = {

        get history() {
            return this.channelManager.getCurrentChannelHistory();
        },

        get length() {
            return this.channelManager.getCurrentChannelLength();
        },

        get currentChannel(){
            return this.channelManager.currentChannel;
        },

        mapChannels: function(func) {
              return this.channelManager.map(func);
        },

        onJoin: function(err, data) {
            var self = this;

            if(err)
                return console.error(err);

            self.username = data.username;
            self.moderator = data.moderator;

            self.channelManager.setChannels(data.channels);

            self.connectionState = 'JOINED';
            self.trigger('joined');
        },

        /** Join to a different channel **/
        joinChannel: function(channelName) {

            //If the channel is already opened just change it
            if(this.channelManager.selectChannel(channelName))
                return this.trigger('channel-changed');

            //Do not attempt to join a channel is we are not connected already
            if(this.connectionState !== 'JOINED')
                return;

            //If not connect to it
            this.ws.emit('join', channelName, this.onJoin.bind(this));
            this.connectionState = 'JOINING';
            this.trigger('joining');
        },

        /** Close the current opened channel **/
        closeCurrentChannel: function() {
            var self = this;

            //If we are connected leave the channel
            if(this.connectionState === 'JOINED') {
                self.ws.emit('leave', this.channelManager.currentChannel, function(err) {
                    if(err) {
                        return console.error('[leave] ', err);
                    }

                    self.channelManager.closeCurrentChannel();
                    self.trigger('channel-closed');
                });

            //If we are not connected just erase the channel from the channel manager
            } else {
                self.channelManager.closeCurrentChannel();
                self.trigger('channel-closed');
            }

        },

        /**
         * Sends chat message
         * @param {string} msg - String containing the message, should be longer than 1 and shorter than 500.
         * @param {bool} isBot - Flag to tell the server than this message is from a bot
         */
        say: function(msg, isBot) {
            var self = this;
            console.assert(msg.length >= 1 && msg.length < 500);
            self.ws.emit('say', msg, this.currentChannel, isBot, function(err) {
                if(err) {
                    switch(err) {
                        case 'INVALID_MUTE_COMMAND':
                            self.channelManager.insertMessageInCurrentChannel(buildChatError('Invalid mute command'));
                            break;

                        case 'USER_DOES_NOT_EXIST':
                            self.channelManager.insertMessageInCurrentChannel(buildChatError('Username does not exist'));
                            break;

                        case 'NOT_A_MODERATOR':
                            self.channelManager.insertMessageInCurrentChannel(buildChatError('Username does not exist'));
                            break;

                        case 'INVALID_UNMUTE_COMMAND':
                            self.channelManager.insertMessageInCurrentChannel(buildChatError('Invalid unmute command'));
                            break;

                        case 'USER_NOT_MUTED':
                            self.channelManager.insertMessageInCurrentChannel(buildChatError('User not muted'));
                            break;

                        case 'UNKNOWN_COMMAND':
                            self.channelManager.insertMessageInCurrentChannel(buildChatError('Unknown command'));
                            break;

                        default:
                            console.error('[say] ', err);
                            break;
                    }
                    self.trigger('say-error');
                }
            });
        },

        /** Add a client message, used for showing errors or messages on the chat **/
        addClientMessage: function(message) {
            var msg = {
                time: Date.now(),
                type: 'client_message',
                message: message
            };

            this.history.unshift(msg);

            this.trigger('client_message');
        },

        /** Display a list of the users currently muted **/
        listMutedUsers: function(ignoredClientList) {

            var ignoredListMessage = '';
            var ignoredClientListArr = Object.keys(ignoredClientList);

            if(ignoredClientListArr.length === 0)
                ignoredListMessage = 'No users ignored';
            else
                ignoredClientListArr.forEach(function(key, index) {
                    if(index !== 0)
                        ignoredListMessage+= ' ,' + ignoredClientList[key].username;
                    else
                        ignoredListMessage+= ignoredClientList[key].username;
                });

            var msg = {
                time: Date.now(),
                type: 'client_message',
                message: ignoredListMessage
            };

            this.history.unshift(msg);

            this.trigger('list_ignored');
        },

        /** Set the visibility mode of the bots **/
        setBotsDisplayMode: function(displayMode) {
            this.botsDisplayMode = displayMode;
            localStorage['botsDisplayMode'] = displayMode;
            this.trigger('bots_visibility_change');
        }
    };


    var ChatSingleton = new Chat();

    /**
     * Here is the other virtual part of the store:
     * The actions created by flux views are converted
     * to calls to the engine which will case changes there
     * and they will be reflected here through the event listener
     */
    AppDispatcher.register(function(payload) {
        var action = payload.action;

        switch(action.actionType) {

            case AppConstants.ActionTypes.SAY_CHAT:
                ChatSingleton.say(action.msg);
                break;

            case AppConstants.ActionTypes.CLIENT_MESSAGE:
                ChatSingleton.addClientMessage(action.message);
                break;

            case AppConstants.ActionTypes.LIST_MUTED_USERS:
                ChatSingleton.listMutedUsers(action.ignoredClientList);
                break;

            case AppConstants.ActionTypes.JOIN_CHANNEL:
                ChatSingleton.joinChannel(action.channelName);
                break;

            case AppConstants.ActionTypes.SET_BOTS_DISPLAY_MODE:
                ChatSingleton.setBotsDisplayMode(action.displayMode);
                break;

            case AppConstants.ActionTypes.CLOSE_CURRENT_CHANNEL:
                ChatSingleton.closeCurrentChannel();
                break;
        }

        return true; // No errors. Needed by promise in Dispatcher.
    });

    return ChatSingleton;
});

function buildChatError(message) {
    return {
        date: new Date(),
        type: 'error',
        message: message
    }
}