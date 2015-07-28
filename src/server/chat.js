var assert   =  require('assert');
var CBuffer  =  require('CBuffer');
var events   =  require('events');
var util     =  require('util');
var _        =  require('lodash');

var db       =  require('./database');
var lib      =  require('./lib');

var CHAT_HISTORY_SIZE = 100;

function Chat(io) {
    var self = this;

    self.io = io;

    // History of chat messages.
    //self.chatTable = new CBuffer(CHAT_HISTORY_SIZE); //Get directly from the database
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
    self.muted = {}; //TODO: Store muted users in the database

    io.on('connection', onConnection);

    function onConnection(socket) {  //socket.user is attached on the login middleware

        //Get user history and send it
        self.getHistory(socket.user, function(history, err) {
            if(err) { //If we couldn't reach the history send an empty array an error, and continue
                sendError('Error getting chat history');
                history = [];
            }

            var res = {};
            res['history'] = history;
            res['username'] = socket.user? socket.user.username : null;

            //Return join info to the user
            socket.emit('join', res);
        });

        ++self.clientCount;
        console.log('Client joined: ', self.clientCount, ' - ', socket.user ? socket.user.username : '~guest~');

        socket.join('joined');
        if (socket.user && socket.user.moderator)
            socket.join('moderators');

        //Attach disconnect handler
        socket.on('disconnect', function() {
            --self.clientCount;
            console.log('Client disconnect, left: ', self.clientCount);
        });

        //Attach chat message handler
        socket.on('say', function(message, isBot) {
            var date = new Date();

            if (!socket.user)
                return sendError(socket, '[say] not logged in');

            if (typeof message !== 'string')
                return sendError(socket, '[say] no message');

            message = message.trim();
            if (message.length == 0 || message.length > 500)
                return sendError(socket, '[say] invalid message size');

            var cmdReg = /^\/([a-zA-z]*)\s*(.*)$/;
            var cmdMatch = message.match(cmdReg);

            if (cmdMatch) //If the message is a command try to execute it
                self.doChatCommand(socket.user, cmdMatch, socket);
            else //If not broadcast the message
                self.say(socket, socket.user, message, isBot, date);
        });
    }

    events.EventEmitter.call(self); //Call event emitter 'constructor' function
}

util.inherits(Chat, events.EventEmitter);

Chat.prototype.doChatCommand = function(user, cmdMatch, socket) {
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

                self.mute(shadow, user, username, timespec,
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
                    user, username,
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

Chat.prototype.getHistory = function (userInfo, callback) {
    var self = this;

    db.getChatTable(CHAT_HISTORY_SIZE, function(err, history) {
        if(err) {
            console.error('[INTERNAL_ERROR] got error ', err, ' loading chat table');
            callback(err);
        }

        //var history = self.chatTable.toArray();

        if (userInfo && userInfo.moderator) {
            history = history.concat(self.modTable.toArray());
            history = _.sortByOrder(history, 'time', 'desc');

            // Sorting by time leaves younger messages at the end. So use
            // the last CHAT_HISTORY_SIZE messages.
            history = history.splice(-CHAT_HISTORY_SIZE);
        }

        callback(history);
    });
};

Chat.prototype.say = function(socket, userInfo, message, isBot, date) {
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

    //self.chatTable.push(msg);
    self.io.to('joined').emit('msg', msg);
    self.saveChatMessage(userInfo, message, isBot, date);
};

Chat.prototype.saveChatMessage = function(user, message, isBot, date) {
    db.addChatMessage(user.id, date, message, isBot, function(err) {
       if(err)
        console.error('[INTERNAL_ERROR] got error ', err, ' saving chat message ', message, ' of user id ', user.id);
    });
};

Chat.prototype.mute = function(shadow, moderatorInfo, username, time, callback) {
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
            self.io.to('joined').emit('msg', msg);
        }
        callback(null);
    });
};

Chat.prototype.unmute = function(moderatorInfo, username, callback) {
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
    } else { //Broadcast to every one that the user was unmuted
        //self.chatTable.push(msg);
        self.io.to('joined').emit('msg', msg);
    }
    callback(null);
};

//Chat.prototype.listmuted = function () {
//    return self.muted;
//};

function sendErrorChat(socket, message) {
    console.warn('Warning: sending client: ', message);
    socket.emit('msg', {
        time: new Date(),
        type: 'error',
        message: message
    });
}

function sendError(socket, description) {
    console.warn('Warning: sending client: ', description);
    socket.emit('err', description);
}

module.exports = Chat;