define([
    'game-logic/clib',
    'constants/AppConstants',
    'lib/indexedMap'
], function(
    Clib,
    AppConstants,
    IndexedMap
) {

    /**
     * Local helper functions
     */
    function getLocalStorageChannels() {
        return JSON.parse(Clib.localOrDef('openedChannels', '["english"]'));
    }

    function createChannel(history) {
        return {
            history: history || [],
            unreadCount: 0
        }
    }

    /**
     * Manager of the channels for the ChatEngineStore
     */
    function ChannelManager() {
        var self = this;

        /** Get the list from localStorage */
        self.OPENED_CHANNELS = getLocalStorageChannels();

        /** Current opened tab on the chat **/
        self._currentChannel = Clib.localOrDef('currentChannel', 'english');

        /** Validate currentChannel **/
        if(self._currentChannel != 'english' && self.OPENED_CHANNELS.indexOf(self._currentChannel) == -1)
            self._currentChannel = 'english';

        /** Object containing the key and the history of each currently connected channel **/
        self._channels = new IndexedMap();

        /** Insert the english channel in the first place **/
        self._channels.insert('english', { history: [], unreadCount: 0 });
    }


    ChannelManager.prototype = {

        get currentChannel() {
            return this._currentChannel;
        },

        getSavedChannels: function() {
            return getLocalStorageChannels();
        },

        getCurrentChannelHistory: function() {
            console.assert(this._channels.has(this._currentChannel));
            return this._channels.get(this._currentChannel).history;
        },

        getCurrentChannelLength: function() {
            console.assert(this._channels.has(this._currentChannel));
            return this._channels.get(this._currentChannel).history.length;
        },

        /**
         * Maps over the channels
         *
         * The function parameters: channelObject,index,channelKeys
         */
        map: function(func) {
            var self = this;

            var arrRes = [];
            self._channels.each(function(channelName, channelObject) {
                var isCurrentChannel = (self._currentChannel === channelName);

                var channelObj = {
                    history: channelObject.history,
                    name: channelName,
                    closable: isCurrentChannel && (channelName != 'english' && channelName != 'moderators'),
                    currentChannel: isCurrentChannel,
                    unreadCount: channelObject.unreadCount
                };

                arrRes.push(func(channelObj, self._channels.keys.indexOf(channelName), self._channels.keys));
            });

            return arrRes;
        },

        /**
         * If the channel is opened select it and return true
         * If is not opened return false
         * Clear the unread count when selecting the channel
         */
        selectChannel: function(channelName) {
            if(this._channels.has(channelName)) {
                this._currentChannel = channelName;
                this._channels.get(channelName).unreadCount = 0;
                this.updateStorage();
                return true;
            }
            return false;
        },

        closeCurrentChannel: function() {
            console.assert(this._channels.has(this._currentChannel));

            //The new selected channel will be the one before the current channel or the first one
            var newIndex;
            var chanIndex = this._channels.index(this._currentChannel);
            if(chanIndex == -1)
                newIndex = 0;
            else
                newIndex = chanIndex-1;

            //Remove the current channel
            this._channels.remove(this._currentChannel);

            //New current channel
            this.selectChannel(this._channels.keyAt(newIndex));

            //Update local storage
            this.updateStorage();

        },

        insertMessage: function(channelName, message, callback) {
            if(!this._channels.has(channelName))
                return callback('CHANNEL_DOES_NOT_EXIST');

            var channel = this._channels.get(channelName);

            //Trim the array history if is too long
            if (channel.history.length > AppConstants.Chat.MAX_LENGTH)
                channel.history.splice(-100, 100);

            //Insert message
            channel.history.unshift(message);

            //If not the current channel add one to the unread count
            if(channelName !== this._currentChannel)
                channel.unreadCount++;

            callback(null);
        },

        insertMessageInCurrentChannel: function(message) {
            console.assert(this._channels.has(this._currentChannel));
            this._channels.get(this._currentChannel).history.unshift(message);
        },

        setChannels: function(channels) {

            //If the mods channel is there put it before others
            if(channels.moderators) {
                this._channels.insert('moderators', createChannel(channels.moderators));
                delete channels.moderators;
            }

            //Add the rest of the channels
            for(var channel in channels)
            {
                //If the channel is already on the history overwrite the history
                if(this._channels.has(channel))
                    this._channels.get(channel).history = channels[channel];

                //If the channel does not exist append it to the history
                this._channels.insert(channel, createChannel(channels[channel]));
            }

            //If we set just one channel the channel will be selected as current channel
            var channelsArr = Object.keys(channels);
            if(channelsArr.length === 1)
                this.selectChannel(channelsArr[0]);

            this.updateStorage();
        },

        //Save the current channel and the opened channels on local storage
        updateStorage: function() {
            localStorage['currentChannel'] = this._currentChannel;
            localStorage['openedChannels'] = JSON.stringify(this._channels.keys);
        }
    };

    return ChannelManager;
});
