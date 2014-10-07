var assert   =  require('assert');
var CBuffer  =  require('CBuffer');
var events   =  require('events');
var util     =  require('util');
var _        =  require('lodash');

var db       =  require('./database');
var lib      =  require('./lib');

function Chat() {
    var self = this;

    self.chatTable = new CBuffer(40);

    /*
      Collection of muted users.
        key:   Username
        value: Date object until when the user is muted
    */
    self.muted = new Object();

    events.EventEmitter.call(self);
}

util.inherits(Chat, events.EventEmitter);

Chat.prototype.getHistory = function () {
    return this.chatTable.toArray();
}

Chat.prototype.say = function(userInfo, message) {
    var self = this;
    var now = new Date();

    if (lib.hasOwnProperty(self.muted, userInfo.username)) {
        if (self.muted[userInfo.username] < now) {
            // User has been muted before, but enough time has passed.
            delete self.muted[userInfo.username];
        } else {
            // User is muted. Ignore the message.
            return 'USER_IS_MUTED';
        }
    }

    var msg = {
        time:      now,
        type:      'say',
        username:  userInfo.username,
        role:      userInfo.userclass,
        message:   message
    };

    console.log(msg);
    self.chatTable.push(msg);
    self.emit('msg', msg);
    return null;
}

Chat.prototype.mute = function(shadow, moderatorInfo, username, time, callback) {
    var self = this;
    var now = new Date();
    var ms  = lib.parseTimeString(time);
    var end = new Date(Date.now() + ms);

    // Query the db to make sure that the username exists.
    db.getUserByName(username, function(err, userInfo) {

        if (err) {
            callback(err);
            return;
        }

        if (lib.hasOwnProperty(self.muted, username)) {
            // User has already been muted.
            var end2 = self.muted[username];
            end = new Date(Math.max(end,end2));
        }
        self.muted[username] = end;

        if (!shadow) {
            var msg = {
                time:        now,
                type:        'mute',
                moderator:   moderatorInfo.username,
                username:    username,
                timespec:    time
            };

            self.emit('msg', msg);
        }
        callback(null);
    });
}

Chat.prototype.unmute = function(moderatorInfo, username) {
    var self = this;
    var now = new Date();

    if (!lib.hasOwnProperty(self.muted, username))
        return 'USER_NOT_MUTED';

    delete self.muted[username];

    var msg = {
        time:      now,
        type:      'unmute',
        moderator: moderatorInfo.username,
        username:  username
    };

    self.emit('msg', msg);
}

Chat.prototype.listmuted = function () {
    return self.muted
}

module.exports = Chat;
