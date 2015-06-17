define([
    'react',
    'game-logic/clib',
    'autolinker',
    'stores/ChatStore',
    'actions/ChatActions',
    'game-logic/engine'
], function(
    React,
    Clib,
    Autolinker,
    ChatStore,
    ChatActions,
    Engine
){

    // Overrides Autolinker.js' @username handler to instead link to
    // user profile page.
    var replaceUsernameMentions = function(autolinker, match) {
      // Use default handler for non-twitter links
      if (match.getType() !== 'twitter') return true;

      var username = match.getTwitterHandle();
      return '<a href="/user/' + username +'" target="_blank">@' + username + '</a>';
    };

    var escapeHTML = (function() {
      var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;'
      };

      return function(str) {
        return String(str).replace(/[&<>"']/g, function (s) {
          return entityMap[s];
        });
      };
    })();

    var D = React.DOM;

    /* Constants */
    var SCROLL_OFFSET = 120;

    function getState(){
        var state = ChatStore.getState();
        state.engine = Engine;
        return state;
    }

    return React.createClass({
        displayName: 'Chat',

        getInitialState: function () {
            var state = getState();

            /* Avoid scrolls down if a render is not caused by length chat change */
            this.listLength = state.engine.chat.length;

            return state;
        },

        componentDidMount: function() {
            Engine.on({ msg: this._onChange });
            ChatStore.addChangeListener(this._onChange);

            var msgs = this.refs.messages.getDOMNode();
            msgs.scrollTop = msgs.scrollHeight;
        },

        componentWillUnmount: function() {
            Engine.off({ msg: this._onChange });
            ChatStore.removeChangeListener(this._onChange);

            var height = this.refs.messages.getDOMNode().style.height;
            ChatActions.setHeight(height);
        },

        /** If the length of the chat changed and the scroll position is near bottom scroll to the bottom **/
        componentDidUpdate: function(prevProps, prevState) {

            if(prevState.engine.chat.length != this.listLength){
                this.listLength = this.state.engine.chat.length;

                var msgsBox = this.refs.messages.getDOMNode();
                var scrollBottom = msgsBox.scrollHeight-msgsBox.offsetHeight-msgsBox.scrollTop;

                if(scrollBottom < SCROLL_OFFSET)
                    msgsBox.scrollTop = msgsBox.scrollHeight;
            }
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _sendMessage: function(e) {
            if(e.keyCode == 13) {
                //var msg = this.state.inputText;
                var msg = e.target.value;
                this._say(msg);
                e.target.value = '';
            }
        },

        _say: function(msg) {
            ChatActions.say(msg);
        },

        _updateInputText: function(ev) {
            ChatActions.updateInputText(ev.target.value);
        },

        render: function() {
            var self = this;
            var messages = this.state.engine.chat.map(renderMessage, self);
            var chatInput;

            if (this.state.engine.username)
                chatInput = D.input(
                    { className: 'chat-input',
                        onKeyDown: this._sendMessage,
                        //onChange: this._updateInputText,
                        //value: this.state.inputText,
                        maxLength: '500',
                        ref: 'input',
                        placeholder: 'Type here...'
                    }
                );
            else
                chatInput = D.input(
                    { className: 'chat-input',
                        ref: 'input',
                        placeholder: 'Log in to chat...',
                        disabled: true
                    }
                );

            return D.div({ className: 'messages-container' },
                D.ul({ className: 'messages', ref: 'messages' },
                    messages
                ),
                chatInput
            );
        }
    });

    function renderMessage(message, index) {
        var self = this;

        var pri = 'msg-chat-message';
        switch(message.type) {
            case 'say':
                if (message.role === 'admin') pri += ' msg-admin-message';

                var username = self.state.engine.username;

                var r = new RegExp('@' + username + '(?:$|[^a-z0-9_\-])', 'i');
                if (username && message.username != username && r.test(message.message)) {
                    pri += ' msg-highlight-message';
                }

                var msgDate = new Date(message.time);
                var timeString = msgDate.getHours() + ':' + ((msgDate.getMinutes() < 10 )? ('0' + msgDate.getMinutes()) : msgDate.getMinutes()) + ' ';

                return D.li({ className: pri , key: 'msg' + index },
                    D.span({
                        className: 'time-stamp'
                    },
                        timeString
                    ),
                    D.a({
                            href: '/user/' + message.username,
                            target: '_blank'
                        },
                        message.username, ':'
                    ),
                    ' ',
                    D.span({
                      className: 'msg-body',
                      dangerouslySetInnerHTML: {
                        __html: Autolinker.link(
                                  escapeHTML(message.message),
                                  { truncate: 50, replaceFn: replaceUsernameMentions }
                                )
                      }
                    })
                    );
            case 'mute':
                pri = 'msg-mute-message';
                return D.li({ className: pri , key: 'msg' + index },
                    D.a({ href: '/user/' + message.moderator,
                            target: '_blank'
                        },
                        '*** <'+message.moderator+'>'),
                    message.shadow ? ' shadow muted ' : ' muted ',
                    D.a({ href: '/user/' + message.username,
                            target: '_blank'
                        },
                        '<'+message.username+'>'),
                    ' for ' + message.timespec);
            case 'error':
            case 'info':
                pri = 'msg-info-message';
                return D.li({ className: pri, key: 'msg' + index },
                    D.span(null, ' *** ' + message.message));
                break;
            default:
                break;
        }
    }

});