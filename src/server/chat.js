var assert   =  require('assert');
var CBuffer  =  require('CBuffer');
var events   =  require('events');
var util     =  require('util');
var _        =  require('lodash');
var debug    =  require('debug')('app:chat');

var db       =  require('./database');
var lib      =  require('./lib');

//2nd step
//Create a mod channel and save it to the database
//Mute users by ip/username and store muted users in the database

var CHAT_HISTORY_SIZE = 100;

function Chat(io) {
    var self = this;

    self.io = io;

    // History of mod only messages.
    self.modTable  = new CBuffer(CHAT_HISTORY_SIZE);
    // Number of connected clients
    self.clientCount = 0;

    /*
     Collection of muted users.
     key:   Username
     value: Object with the following fields
     time:       Date object when the user was muted
     moderator:  The username of the moderator that muted the user
     timespec:   Initial (nominal diff) time the user has been muted
     end:        Until when the user is muted
     shadow:     If the mute is a shadow mute
     */
    self.muted = {};

    io.on('connection', onConnection);

    function onConnection(socket) {  //socket.user is attached on the login middleware
        debug('socket connection event received');

        //Attach disconnect handler
        socket.on('disconnect', function() {
            --self.clientCount;
            console.log('Client disconnect, left: ', self.clientCount);
            debug('client disconnect');
        });

        //Join to a Room
        socket.on('join', function(channelName) {
            debug('join event received from user %s', socket.user ? socket.user.username : '~guest~');

            //Check channelName variable and avoid users to join the mods channel
            if(typeof channelName !== 'string' || channelName.length < 1 || channelName.length > 100 || channelName === 'moderators')
                return sendError(socket, 'The channel name should be a string between 1 and 100');

            self.join(socket, channelName);
        });

        //Register the message event
        socket.on('say', function(message, isBot) {
            self.onSay(socket, message, isBot);
        });

        ++self.clientCount;
        console.log('Client joined: ', self.clientCount, ' - ', socket.user ? socket.user.username : '~guest~'); //TODO: Add ip address
    }

    events.EventEmitter.call(self); //Call event emitter 'constructor' function
}

util.inherits(Chat, events.EventEmitter);

Chat.prototype.join = function(socket, channelName) {
    var self = this;

    //Check if the user was joined to another room before, if it was leave that room
    if(socket.currentChannel)
        socket.leave(socket.currentChannel);

    //Save the name of the current room in the socket, this can also be used to check if the user is joined into a channel
    socket.currentChannel = channelName;

    //Get user history of a room and send it to the user
    self.getHistory(socket.user, channelName, function(err, history) {

        //If we couldn't reach the history send an empty history to the user
        if(err) {
            history = [];
        }

        var res = {
            history: history,
            username: socket.user ? socket.user.username : null,
            channel: channelName
        };

        //Actually join the socket.io room
        socket.join(channelName);

        //If the user is a mod join to the mods room
        if (socket.user && socket.user.moderator)
            socket.join('moderators');

        //Return join info to the user
        socket.emit('join', res);
    });

};

Chat.prototype.onSay = function(socket, message, isBot) {
    if (!socket.user)
        return sendError(socket, '[say] you must be logged in to chat');

    if (!socket.currentChannel)
        return sendError(socket, '[say] you must be joined before you can chat');

    var date = new Date();

    message = message.trim();

    isBot = isBot || /^!.*$/.test(message); //Messages starting with a bot prefix "!" are treated as a bot

    if (typeof message !== 'string')
        return sendError(socket, '[say] no message');

    if (message.length == 0 || message.length > 500)
        return sendError(socket, '[say] invalid message size');

    var cmdReg = /^\/([a-zA-z]*)\s*(.*)$/;
    var cmdMatch = message.match(cmdReg);

    if (cmdMatch) //If the message is a command try to execute it
        this.doChatCommand(socket.user, cmdMatch, socket.currentChannel, socket);
    else //If not broadcast the message
        this.say(socket, socket.user, message, socket.currentChannel, isBot, date);

};



Chat.prototype.doChatCommand = function(user, cmdMatch, channelName, socket) {
    var self = this;

    var cmd  = cmdMatch[1];
    var rest = cmdMatch[2];

    switch (cmd) {
        case 'shutdown':
            return sendErrorChat(socket, '[say] deprecated feature');
        case 'mute':
        case 'shadowmute':
            if (user.moderator) {
                var muteReg = /^\s*([a-zA-Z0-9_\-]+)\s*([1-9]\d*[dhms])?\s*$/;
                var muteMatch = rest.match(muteReg);

                if (!muteMatch)
                    return sendErrorChat(socket, 'Usage: /mute <user> [time]');

                var username = muteMatch[1];
                var timespec = muteMatch[2] ? muteMatch[2] : "30m";
                var shadow   = cmd === 'shadowmute';

                self.mute(shadow, user, username, timespec, channelName,
                    function (err) {
                        if (err)
                            return sendErrorChat(socket, err);
                    });
            } else {
                return sendErrorChat(socket, 'Not a moderator.');
            }
            break;
        case 'unmute':
            if (user.moderator) {
                var unmuteReg = /^\s*([a-zA-Z0-9_\-]+)\s*$/;
                var unmuteMatch = rest.match(unmuteReg);

                if (!unmuteMatch)
                    return sendErrorChat(socket, 'Usage: /unmute <user>');

                var username = unmuteMatch[1];
                self.unmute(
                    user, username, channelName,
                    function (err) {
                        if (err) return sendErrorChat(socket, err);
                    });
            }
            break;
        default:
            socket.emit('msg', {
                time: new Date(),
                type: 'error',
                message: 'Unknown command ' + cmd
            });
            break;
    }
};

Chat.prototype.getHistory = function (userInfo, channelName, callback) {
    var self = this;

    db.getChatTable(CHAT_HISTORY_SIZE, channelName, function(err, history) {
        if(err) {
            console.error('[INTERNAL_ERROR] got error ', err, ' loading chat table');
            return callback(err);
        }

        //var history = self.chatTable.toArray();

        if (userInfo && userInfo.moderator) {
            history = history.concat(self.modTable.toArray());
            history = _.sortByOrder(history, 'time', 'desc');

            // Sorting by time leaves younger messages at the end. So use
            // the last CHAT_HISTORY_SIZE messages.
            history = history.splice(-CHAT_HISTORY_SIZE);
        }

        callback(null, history);
    });
};

Chat.prototype.say = function(socket, userInfo, message, channelName, isBot, date) {
    var self = this;

    isBot = !!isBot;

    var msg = {
        time:      date,
        type:      'say',
        username:  userInfo.username,
        role:      userInfo.userclass,
        message:   message,
        bot:       isBot
    };

    if (lib.hasOwnProperty(self.muted, userInfo.username)) {
        var muted = self.muted[userInfo.username];
        if (muted.end < date) {
            // User has been muted before, but enough time has passed.
            delete self.muted[userInfo.username];
        } else if (muted.shadow) {
            // User is shadow muted. Echo the message back to the
            // user but don't broadcast.
            socket.emit('msg', msg);
            return;
        } else {
            // Inform the user that he is still muted.
            socket.emit('msg',
                {
                    time: date,
                    type: 'info',
                    message: 'You\'re muted. ' +
                    lib.printTimeString(muted.end - now) +
                    ' remaining'
                });
            return;
        }
    }

    if(isBot)
        self.io.sockets.emit('msg', msg);
    else
        self.io.to(channelName).emit('msg', msg);
    self.saveChatMessage(userInfo, message, channelName, isBot, date);
};

Chat.prototype.saveChatMessage = function(user, message, channelName, isBot, date) {
    db.addChatMessage(user.id, date, message, channelName, isBot, function(err) {
       if(err)
        console.error('[INTERNAL_ERROR] got error ', err, ' saving chat message of user id ', user.id);
    });
};

Chat.prototype.mute = function(shadow, moderatorInfo, username, time, channelName, callback) {
    var self = this;
    var now = new Date();
    var ms  = lib.parseTimeString(time);
    var end = new Date(Date.now() + ms);

    // Query the db to make sure that the username exists.
    db.getUserByName(username, function(err, userInfo) {

        if (err) {
            if(typeof err === 'string') //USERNAME_DOES_NOT_EXIST
                callback(err);
            else
                console.error('[INTERNAL_ERROR] got error ', err, ' muting user ', userInfo.username);
            return;
        }
        assert(userInfo);

        // Overriding previous mutes.
        self.muted[userInfo.username] = {
            time:        now,
            moderator:   moderatorInfo.username,
            timespec:    time,
            end:         end,
            shadow:      shadow
        };

        var msg = {
            time:        now,
            type:        'mute',
            moderator:   moderatorInfo.username,
            username:    userInfo.username,
            timespec:    time,
            shadow:      shadow
        };

        if (shadow) {
            self.modTable.push(msg);
            self.io.to('moderators').emit('msg', msg);
        } else {
            //self.chatTable.push(msg);
            self.io.to(channelName).emit('msg', msg);
        }
        callback(null);
    });
};

Chat.prototype.unmute = function(moderatorInfo, username, channelName, callback) {
    var self = this;
    var now = new Date();

    if (!lib.hasOwnProperty(self.muted, username))
        return callback('USER_NOT_MUTED');

    var shadow = self.muted[username].shadow;
    delete self.muted[username];

    var msg = {
        time:      now,
        type:      'unmute',
        moderator: moderatorInfo.username,
        username:  username,
        shadow:    shadow
    };

    if (shadow) { //If the user was shadow mute just let the moderators now that it was unmuted
        self.modTable.push(msg);
        self.io.to('moderators').emit('msg', msg);
    } else { //Broadcast to the user's room that an user was muted
        self.io.to(channelName).emit('msg', msg);
    }
    callback(null);
};

//Send an error to the chat to a socket
function sendErrorChat(socket, message) {
    console.warn('Warning: sending client: ', message);
    socket.emit('msg', {
        time: new Date(),
        type: 'error',
        message: message
    });
}

//Send an error event to a socket
function sendError(socket, description) {
    console.warn('Warning: sending client: ', description);
    socket.emit('err', description);
}

module.exports = Chat;