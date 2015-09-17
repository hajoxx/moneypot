var assert   =  require('assert');
var events   =  require('events');
var util     =  require('util');
var _        =  require('lodash');
var debug    =  require('debug')('app:chat');
var async    =  require('async');

var db       =  require('./database');
var lib      =  require('./lib');

/** How to use the chat on the client?
 *
 * 1.- Connect with socket.io to bustabit.com
 *      The id(session) cookie on the socket.io handshake is used for authentication
 * 2.- On connect emit a join event with the channel name you want to join
 * 3.- Listen for the 'say' and other stuff
 *
 * There is an all channel where every message is broadcasted
 * The bots should send every message with the flag is bot for other clients to be able to filter them if they want
 *
 * Moderators:
 *  Are joined to the moderators channel automatically
 *  TODO: For every channel joined they are joined to a 'mod:channelName' channel where
 */

/**
 * 2nd step
 * Create a mod channel and save it to the database
 * Mute users by ip/username and store muted users in the database
 **/

var CHAT_HISTORY_SIZE = 100;

var SPECIAL_CHANNELS = {
    all: {
        desc: 'Channel where all messages are broadcasted, read only',
        writable: false,
        modsOnly: false
    },

    moderators: {
        desc: 'Channel for moderators only, they are joined automatically',
        writable: true,
        modsOnly: true
    }

    /**
    This is the behaviour for all the other channels:
    defaultProps: {
        desc: '',
        writable: true,
        modsOnly: false
    }
    **/
};

// There is a mods channel for every channel
// The mods are joined to a channel called mod:channelName

function Chat(io) {
    var self = this;

    self.io = io;

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

        /**
         * Join to a room or an array of rooms
         *
         * @param {string || array} channels -required-  string of channel name or array of string of channel names
         * @param {function(err:string)} callback -required- function to send error codes to the client or success
         *
         * Callback error codes:
         *  INVALID_CHANNEL_NAME
         *  INVALID_PROPERTY
         *  INTERNAL_ERROR
         */
        socket.on('join', function(channels, callback) {
            debug('join event received from user %s', socket.user ? socket.user.username : '~guest~');
            self.join(socket, channels, callback);
        });

        /**
         * Leave a room or an array of rooms
         *
         * @param {string || array} channels -required-  string of channel name or array of string of channel names
         * @param {function(err:string)} callback -required- function to send error codes to the client or success
         *
         * Callback error codes:
         *  INVALID_CHANNEL_NAME
         *  INVALID_PROPERTY
         *  INTERNAL_ERROR
         */
        socket.on('leave', function(channels, callback) {
            debug('leave event received from user %s', socket.user ? socket.user.username : '~guest~');
            self.leave(socket, channels, callback);
        });

        /**
         * Send a message to a channel or execute a command
         *
         * @param {string} message -required- text message or command with the format /command parameter
         * @param {string} channelName -required- the name of the channel
         * @param {boolean} isBot -required- flag to tell if the message comes from a bot
         * @param {function} callback -required- function to send error codes to the client or success
         *
         * Callback error codes:
         *  NOT_LOGGED
         *  INVALID_CHANNEL_NAME
         *  READ_ONLY_CHANNEL
         *  INVALID_PROPERTY
         *  INVALID_MESSAGE_LENGTH
         *
         *  DEPRECATED_FEATURE
         *  INVALID_MUTE_COMMAND
         *  USERNAME_DOES_NOT_EXIST
         *  NOT_A_MODERATOR
         *  INVALID_UNMUTE_COMMAND
         *  USER_NOT_MUTED
         *  UNKNOWN_COMMAND
         *
         */
        socket.on('say', function(message, channelName, isBot, callback) {
            self.onSay(socket, message, channelName, isBot, callback);
        });

        ++self.clientCount;
        console.log('Client joined: ', self.clientCount, ' - ', socket.user ? socket.user.username : '~guest~');
    }

    events.EventEmitter.call(self); //Call event emitter 'constructor' function
}

util.inherits(Chat, events.EventEmitter);

Chat.prototype.join = function(socket, channels, callback) {
    var self = this;

    //Callback validation
    if(!_.isFunction(callback))
        return sendError(socket, '[join] no callback');

    //String channel validation
    if(_.isString(channels)) {
        if(isChannelNameInvalid(channels, socket.moderator)) {
            debug('[Join] INVALID_CHANNEL_NAME');
            return callback('INVALID_CHANNEL_NAME', channels);
        }
        channels = [channels];

    //Array of channels validation
    } else if(_.isArray(channels)) {
        for(var i = 0, length = channels.length; i < length; i++)

            //If the channel is not valid send a 'soft' error and remove the channel from the array
            if(isChannelNameInvalid(channels[i], socket.moderator)) {
                debug('[Join] INVALID_CHANNEL_NAME');
                sendError(socket, '[Join] INVALID_CHANNEL_NAME');

                //Remove the bad channel
                channels.splice(i, 1);
                i--;
                length--;
            }
    } else {
        debug('[Join] INVALID_PROPERTY');
        return callback('INVALID_PROPERTY');
    }

    //If the user is a mod auto join them to the mods channels if not in the channels list already
    if(socket.moderator && !socket.adapter.rooms.moderators && channels.indexOf('moderators') === -1)
        channels.push('moderators');

    var res = {
        username: socket.user ? socket.user.username : null,
        moderator: socket.moderator,
        channels: {}
    };

    //Get history of the channels and append it to the response
    async.each(channels, function(channelName, callback) {

        self.getHistory(channelName, function(err, history) {

            //If we couldn't reach the history send an empty history to the user, the error was already logged
            if(err)
                history = [];

            //Append the history to the response
            res.channels[channelName] = history;

            //Actually join the socket.io room
            socket.join(channelName);

            //If the user is mod and is not on the mods channel join him to the channel mod:channelName
            if(socket.moderator && channelName !== 'moderators') {
                var chan = 'mod:'+channelName;
                socket.join(chan);
            }
            
            //Async function success
            callback();
        });

    }, function(err) {
        if(err) {
            console.error('[INTERNAL_ERROR]: Error getting chat history, this error should not happen: ', err);
            return callback('INTERNAL_ERROR');
        }

        //Return join info to the user
        callback(null, res);
    });
};

Chat.prototype.leave = function(socket, channels, callback) {

    //Callback validation
    if(!_.isFunction(callback))
        return sendError(socket, '[join] no callback');

    //Channels validation
    if(_.isString(channels)) {
        if(isChannelNameInvalid(channels, socket.moderator))
            return callback('INVALID_CHANNEL_NAME');
        channels = [channels];
    } else if(_.isArray(channels)) {
        for(var i = 0, length = channels.length; i < length; i++)
            if(isChannelNameInvalid(channels[i], socket.moderator))
                return callback('INVALID_CHANNEL_NAME');
    } else {
        return callback('INVALID_PROPERTY');
    }

    //Leave all the channels on the array
    async.each(channels, function(channelName, callback) {
        socket.leave(channelName, callback);
    }, function(err) {
        if(err) {
            console.error('[INTERNAL_ERROR]: Error leaving channel: ', err);
            return callback('INTERNAL_ERROR');
        }

        //Return success to the user
        callback(null);
    });
};

Chat.prototype.onSay = function(socket, message, channelName, isBot, callback) {

    //Callback validation
    if(!_.isFunction(callback))
        return sendError(socket, '[join] no callback');

    if (!socket.user)
        return callback('NOT_LOGGED');

    if(isChannelStringInvalid(channelName))
        return callback('INVALID_CHANNEL_NAME');

    //Check if the message is for a non writable channel ('all')
    if(SPECIAL_CHANNELS.hasOwnProperty(channelName) && !SPECIAL_CHANNELS[channelName].writable)
        return callback('READ_ONLY_CHANNEL');

    //Cast is bot flag
    isBot = !!isBot;

    message = message.trim();

    if (typeof message !== 'string')
        return callback('INVALID_PROPERTY');

    if (message.length == 0 || message.length > 500)
        return callback('INVALID_MESSAGE_LENGTH');

    var cmdReg = /^\/([a-zA-z]*)\s*(.*)$/;
    var cmdMatch = message.match(cmdReg);

    if (cmdMatch) //If the message is a command try to execute it
        this.doChatCommand(socket.user, cmdMatch, channelName, socket, callback);
    else //If not broadcast the message
        this.say(socket, socket.user, message, channelName, isBot, callback);
};

Chat.prototype.doChatCommand = function(user, cmdMatch, channelName, socket, callback) {
    var self = this;

    var username;
    var cmd  = cmdMatch[1];
    var rest = cmdMatch[2];

    switch (cmd) {
        case 'shutdown':
            return callback('DEPRECATED_FEATURE');
        case 'mute':
        case 'shadowmute':

            if (socket.moderator) {
                var muteReg = /^\s*([a-zA-Z0-9_\-]+)\s*([1-9]\d*[dhms])?\s*$/;
                var muteMatch = rest.match(muteReg);

                if (!muteMatch)
                    return callback('INVALID_MUTE_COMMAND');

                username = muteMatch[1];
                var timespec = muteMatch[2] ? muteMatch[2] : "30m";
                var shadow   = cmd === 'shadowmute';

                self.mute(shadow, user, username, timespec, channelName,
                    function (err) {
                        if (err) {
                            if(err === 'USER_DOES_NOT_EXIST')
                                return callback(err);
                            return console.error('[INTERNAL_ERROR] error on mute command: ', err);
                        }

                        //User muted
                        callback(null);
                    });
            } else {
                return callback('NOT_A_MODERATOR');
            }
            break;
        case 'unmute':
            if (socket.moderator) {
                var unmuteReg = /^\s*([a-zA-Z0-9_\-]+)\s*$/;
                var unmuteMatch = rest.match(unmuteReg);

                if (!unmuteMatch)
                    return callback('INVALID_UNMUTE_COMMAND');

                username = unmuteMatch[1];
                self.unmute(user, username, channelName,
                    function (err) {
                        if(err) {
                            if(err === 'USER_NOT_MUTED')
                                return callback(err);
                            return console.error('[INTERNAL_ERROR] error on unmute command: ', err);
                        }

                        //User unmuted
                        callback(null);
                    });
            }
            break;
        default:
            callback('UNKNOWN_COMMAND');
            break;
    }
};

Chat.prototype.getHistory = function (channelName, callback) {
    if(channelName === 'all')
        db.getAllChatTable(CHAT_HISTORY_SIZE, fn);
    else
        db.getChatTable(CHAT_HISTORY_SIZE, channelName, fn);

    function fn (err, history) {
        if(err) {
            console.error('[INTERNAL_ERROR] got error ', err, ' loading chat table');
            return callback(err);
        }

        callback(null, history);
    }
};

Chat.prototype.say = function(socket, user, message, channelName, isBot, callback) {
    var self = this;

    var date = new Date();

    var msg = {
        date:      date,
        type:      'say',
        username:  user.username,
        role:      user.userclass,
        message:   message,
        bot:       isBot,
        channelName: channelName
    };

    //Check if the user is muted
    if (lib.hasOwnProperty(self.muted, user.username)) {
        var muted = self.muted[user.username];

        // User has been muted before, but enough time has passed.
        if (muted.end < date) {
            delete self.muted[user.username];

        // User is shadow muted. Echo the message back to the
        // user but don't broadcast.
        } else if (muted.shadow) {
            return self.sendMessageToUser(socket, msg);

        //Tell the user he is muted
        } else {
            self.sendMessageToUser(socket, {
                date:      date,
                type:      'info',
                username:  user.username,
                role:      user.userclass,
                message:   'You\'re muted. ' + lib.printTimeString(muted.end - date) + ' remaining',
                bot:       false,
                channelName: channelName
            });
            return;
        }
    }

    //Send the message
    self.sendMessageToChannel(channelName, msg, user.id);
    callback(null);
};

/** Send a message to the user of this socket **/
Chat.prototype.sendMessageToUser = function(socket, msg) {
    socket.emit('msg', msg);
};

/** Send a message to a channel and to the all channel and store it in the database **/
Chat.prototype.sendMessageToChannel = function(channelName, msg, userID) {
    console.assert(msg.hasOwnProperty('bot') && msg.date, msg.hasOwnProperty('message') && msg.type);

    //Send message to channel
    this.io.to(channelName).emit('msg', msg);

    //Send message to subscribers of 'all' (SHIBA)
    this.io.to('all').emit('msg', msg);

    //Save message on DB
    this.saveChatMessage(userID, msg.message, channelName, msg.bot, msg.date);
};

Chat.prototype.saveChatMessage = function(userId, message, channelName, isBot, date) {
    db.addChatMessage(userId, date, message, channelName, isBot, function(err) {
       if(err)
        console.error('[INTERNAL_ERROR] got error ', err, ' saving chat message of user id ', userId);
    });
};

Chat.prototype.mute = function(shadow, moderatorUser, username, time, channelName, callback) {
    var self = this;
    var now = new Date();
    var ms  = lib.parseTimeString(time);
    var end = new Date(Date.now() + ms);

    // Query the db to make sure that the username exists.
    db.getUserByName(username, function(err, userInfo) {

        if (err) {
            if(typeof err === 'string') //USER_DOES_NOT_EXIST
                callback(err);
            else
                console.error('[INTERNAL_ERROR] got error ', err, ' muting user ', userInfo.username);
            return;
        }
        assert(userInfo);

        // Overriding previous mutes.
        self.muted[userInfo.username] = {
            date:        now,
            moderator:   moderatorUser.username,
            timespec:    time,
            end:         end,
            shadow:      shadow
        };

        var msg = {
            date:        now,
            type:        'mute',
            message: null,
            moderator:   moderatorUser.username,
            username:    userInfo.username,
            timespec:    time,
            shadow:      shadow,
            bot: false
        };

        //If mute shadow inform only mods about it
        if (shadow) {
            msg.channelName = 'moderators';
            self.io.to('moderators').emit('msg', msg);
            //self.io.to('mod:'+channelName).emit('msg', msg); //TODO: Send it also to the mods on the current channel
        //If regular mute send mute message to the channel
        } else {

            //Send to current channel
            msg.channelName = channelName;
            self.io.to(channelName).emit('msg', msg);

            //Sends to mods channel if we are not currently on it
            if(channelName !== 'moderators') {

                msg.channelName = 'moderators';
                self.io.to('moderators').emit('msg', msg);
            }
        }

        callback(null);
    });
};

Chat.prototype.unmute = function(moderatorUser, username, channelName, callback) {
    var self = this;
    var now = new Date();

    if (!lib.hasOwnProperty(self.muted, username))
        return callback('USER_NOT_MUTED');

    var shadow = self.muted[username].shadow;
    delete self.muted[username];

    var msg = {
        date:      now,
        type:      'unmute',
        message: null,
        moderator: moderatorUser.username,
        username:  username,
        shadow:    shadow,
        bot: false
    };

    //If mute shadow inform only mods about it
    if (shadow) {
        msg.channelName = 'moderators';
        self.io.to('moderators').emit('msg', msg);
        //self.io.to('mod:'+channelName).emit('msg', msg); //TODO: Send it also to the mods on the current channel
        //If regular mute send mute message to the channel
    } else {

        //Send to current channel
        msg.channelName = channelName;
        self.io.to(channelName).emit('msg', msg);

        //Sends to mods channel if we are not currently on it
        if(channelName !== 'moderators') {

            msg.channelName = 'moderators';
            self.io.to('moderators').emit('msg', msg);
        }
    }

    callback(null);
};

//Send an error event to a client's socket
function sendError(socket, description) {
    debug('Chat client error ', description);
    socket.emit('err', description);
}

function isChannelNameInvalid(channelName, moderator) {
    //Check channelName variable and avoid users to join the mods channel
    if(isChannelStringInvalid(channelName) || isChannelNameModsOnly(channelName))
        return true;

    //Check if the channel is moderators only
    if(SPECIAL_CHANNELS.hasOwnProperty(channelName))
        if(SPECIAL_CHANNELS[channelName].modsOnly && !moderator)
            return true;
    return false;
}

function isChannelStringInvalid(channelName) {
    return (typeof channelName !== 'string' || channelName.length < 1 || channelName.length > 100);
}

function isChannelNameModsOnly(channelName) {
    return /^mod:/.test(channelName);
}

module.exports = Chat;