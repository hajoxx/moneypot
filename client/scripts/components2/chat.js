define(['lib/react', 'lib/clib'], function(React, Clib) {
    var D = React.DOM;

    /* Constants */
    var SCROLL_OFFSET = 120;

    function renderMessage(message, index) {
        var self = this;

        var pri;
        switch(message.type) {
        case 'say':
            switch(message.role) {
                case 'admin':
                    pri = 'msg-admin-message';
                    break;
                case 'moderator':
                    pri = 'msg-moderator-message';
                    break;
                case 'user':
                default:
                    pri = 'msg-chat-message';
                    break;
            }
            var username = self.props.engine.username;
            if (username && message.username != username && message.message.toLowerCase().indexOf(username.toLowerCase()) != -1) {
                pri += ' msg-highlight-message';
            }
            return D.li({ className: pri , key: 'msg' + index },
                        D.a({
                              href: '/user/' + message.username,
                              target: '_blank'
                            },
                            message.username, ':'), ' ', message.message);
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

    return React.createClass({
        displayName: 'Chat',

        propTypes: {
            engine: React.PropTypes.object.isRequired
        },

        getInitialState: function() {
            /* Avoid scrolls down if a render is about to occur and it is not caused by the chat */
            this.listLength = this.props.engine.chat.length;

            return {}
        },

        copyGameInfo: function(message) {
            return function() {
                window.prompt("Copy to clipboard: Ctrl+C, Enter", 'ID: ' + message.game_id + '\n Hash: ' + message.hash + '\n Seed hash: ' + message.seed_hash);
            }
        },

        render: function() {
            var self = this;
            var messages = this.props.engine.chat.map(renderMessage, self);
            var chatInput;

            if(this.props.engine.username) //TODO: Engine should have a variable loggedIn or similar.
                chatInput = D.input(
                    { className: 'chat-input',
                      onKeyDown: this.sendMessage,
                      ref: 'input',
                      placeholder: 'Type here...'
                    }
                );
            else
                chatInput = D.input(
                    { className: 'chat-input',
                      onKeyDown: this.sendMessage,
                      ref: 'input',
                      placeholder: 'Log in to chat...',
                      disabled: true
                    }
                );

            return D.div({ className: 'messages-container' },
                 D.ul({ className: 'messages', ref: 'messages'},
                      messages
                     ),
                 chatInput
            );
        },

        sendMessage: function(e) {
            if(e.keyCode == 13) {
                var msg = this.refs.input.getDOMNode().value;
                if(msg.length > 1 && msg.length < 500){
                    this.props.engine.say(msg, function(error) {
                        console.log('Error sending message', error); //TODO: handle error.
                    });
                    this.refs.input.getDOMNode().value = '';
                }
            }
        },

        shouldComponentUpdate: function(nextProps, nextState) {
            if(nextProps.engine.chat.length != this.listLength) {
                this.listLength = nextProps.engine.chat.length;
                return true;
            }
            return false;
        },

        componentDidUpdate: function() {
            var msgs = this.refs.messages.getDOMNode();
            var scrollBottom = msgs.scrollHeight-msgs.offsetHeight-msgs.scrollTop;

            if(scrollBottom < SCROLL_OFFSET)
                msgs.scrollTop = msgs.scrollHeight;
        },

        componentDidMount: function() {
            var msgs = this.refs.messages.getDOMNode();
            msgs.scrollTop = msgs.scrollHeight;
        }
    });

});