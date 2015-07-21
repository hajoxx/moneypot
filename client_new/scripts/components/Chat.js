define([
    'react',
    'game-logic/clib',
    'autolinker',
    'stores/ChatStore',
    'actions/ChatActions',
    'game-logic/chat'
], function(
    React,
    Clib,
    Autolinker,
    ChatStore,
    ChatActions,
    ChatEngine
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

    function getState(evName){
        var state = ChatStore.getState();
        state.evName = evName;
        return state;
    }

    return React.createClass({
        displayName: 'Chet',

        getInitialState: function () {
            var state = getState();

            /* Avoid scrolls down if a render is not caused by length chat change */
            this.listLength = ChatEngine.history.length;

            return state;
        },

        componentDidMount: function() {
            ChatEngine.on('all', this._onChange);
            ChatStore.addChangeListener(this._onChange);

            //Scroll to the bottom
            var msgsNode = this.refs.messages.getDOMNode();
            msgsNode.scrollTop = msgsNode.scrollHeight;
        },

        componentWillUnmount: function() {
            ChatEngine.off('all', this._onChange);
            ChatStore.removeChangeListener(this._onChange);

            var height = this.refs.messages.getDOMNode().style.height;
            ChatActions.setHeight(height);
        },

        /** If the length of the chat changed and the scroll position is near bottom scroll to the bottom **/
        componentDidUpdate: function(prevProps, prevState) {

            if(this.state.evName === 'join') {//On join scroll to the bottom
                var msgsNode = this.refs.messages.getDOMNode();
                msgsNode.scrollTop = msgsNode.scrollHeight;

            } else if(ChatEngine.history.length != this.listLength){ //If there is a new message scroll to the bottom if is near to it

                this.listLength = ChatEngine.history.length;

                var msgsBox = this.refs.messages.getDOMNode();
                var scrollBottom = msgsBox.scrollHeight-msgsBox.offsetHeight-msgsBox.scrollTop;

                if(scrollBottom < SCROLL_OFFSET)
                    msgsBox.scrollTop = msgsBox.scrollHeight;
            }
        },

        _onChange: function(evName) {
            if(this.isMounted())
                this.setState(getState(evName));
        },

        _sendMessage: function(e) {
            if(e.keyCode == 13) {
                //var msg = this.state.inputText;
                var msg = e.target.value;
                msg = msg.trim();
                if(msg.length >= 1 && msg.length < 500) {
                    this._say(msg);
                    e.target.value = '';
                }
            }
        },

        _say: function(msg) {
            ChatActions.say(msg);
        },

        _updateInputText: function(ev) {
            ChatActions.updateInputText(ev.target.value);
        },

        render: function() {
            var messages = [];
            for(var i = ChatEngine.history.length-1; i >= 0; i--)
                messages.push(renderMessage(ChatEngine.history[i], i));

            var chatInput;

            if(!ChatEngine.isConnected)
                return D.div({ className: 'messages-container' },
                    D.div({ className: 'loading-container' },
                        ''//Loading spinner is added by css as background
                ));

            if (ChatEngine.username)
                chatInput = D.input( //Input is not binded due to slowness on some browsers
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
                chatInput,
                D.div({ className: 'spinner-pre-loader' })
            );
        }
    });

    function renderMessage(message, index) {

        var pri = 'msg-chat-message';
        switch(message.type) {
            case 'say':
                if (message.role === 'admin') pri += ' msg-admin-message';

                var username = ChatEngine.username;

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
            case 'unmute':
                pri = 'msg-mute-message';
                return D.li({ className: pri , key: 'msg' + index },
                            D.a({ href: '/user/' + message.moderator,
                                    target: '_blank'
                                },
                                '*** <'+message.moderator+'>'),
                            message.shadow ? ' shadow unmuted ' : ' unmuted ',
                            D.a({ href: '/user/' + message.username,
                                    target: '_blank'
                                },
                                '<'+message.username+'>')
                        );
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