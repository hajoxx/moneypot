define([
   'socketio',
    'lib/events',
    'constants/AppConstants',
    'dispatcher/AppDispatcher'
], function(
    io,
    Events,
    AppConstants,
    AppDispatcher
) {
    function Chat() {
        var self = this;

        /**
         * Chat inherits from BackBone events:
         * http://backbonejs.org/#Events
         * which means it has events like .on, off, .trigger, .once, .listenTo, .stopListening
         */
        _.extend(this, Events);

        self.ws = io(AppConstants.Engine.CHAT_HOST);

        /** The socket is connected and logged (as user || guest) **/
        self.isConnected = false;

        /** Username, if it is false the user is a guest **/
        self.username = null;

        /** Array containing chat history */
        self.history = [];

        self.ws.on('join', function(info) {
            self.username = info.username;
            self.history = info.history;

            self.isConnected = true;

            self.trigger('join');
        });

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
            //The chat only renders if the Arr length is diff, remove blocks of the array
            if (self.history.length > AppConstants.Chat.MAX_LENGTH)
                self.history.splice(0, 400);

            // Match @username until end of string or invalid username char
            var r = new RegExp('@' + self.username + '(?:$|[^a-z0-9_\-])', 'i');
            if (data.type === 'say' && data.username !== self.username && r.test(data.message)) {
                new Audio('/sounds/gong.mp3').play();
            }
            self.history.unshift(data);

            self.trigger('msg', data);
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

        self.ws.on('disconnect', function(data) {
            self.isConnected = false;
            console.log('Chat Client disconnected |', data, '|', typeof data);
            self.trigger('disconnected');
        });
    }

    /**
     * Sends chat message
     * @param {string} msg - String containing the message, should be longer than 1 and shorter than 500.
     */
    Chat.prototype.say = function(msg) {
        console.assert(msg.length >= 1 && msg.length < 500);
        this.ws.emit('say', msg);
    };

    /** Add a client message, used for showing errors or messages on the chat **/
    Chat.prototype.addClientMessage = function(message) {
        var msg = {
            time: Date.now(),
            type: 'client_message',
            message: message
        };

        this.history.unshift(msg);

        this.trigger('client_message');
    };

    /** Display a list of the users currently muted **/
    Chat.prototype.listMutedUsers = function(ignoredClientList) {

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
        }

        return true; // No errors. Needed by promise in Dispatcher.
    });

    return ChatSingleton;
});