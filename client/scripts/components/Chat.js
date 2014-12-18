define([
    'lib/react',
    'lib/clib',
    'stores/EngineVirtualStore',
    'actions/ChatActions'
], function(
    React,
    Clib,
    EngineVirtualStore,
    ChatActions
){

    var D = React.DOM;

    /* Constants */
    var SCROLL_OFFSET = 120;

    function renderMessage(message, index) {
        var self = this;

        var pri = 'msg-chat-message';
        switch(message.type) {
            case 'say':
                if (message.role === 'admin') pri += ' msg-admin-message';

                var username = self.state.engine.username;
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

    function getState(){
        return {
            engine: EngineVirtualStore.getState()
        }
    }

    return React.createClass({
        displayName: 'Chat',

        getInitialState: function () {
            var state = getState();

            /* Avoid scrolls down if a render is about to occur and it is not caused by the chat */
            this.listLength = state.engine.chat.length;

            return state;
        },

        componentDidMount: function() {
            EngineVirtualStore.addChangeListener(this._onChange);

            var msgs = this.refs.messages.getDOMNode();
            msgs.scrollTop = msgs.scrollHeight;
        },

        componentWillUnmount: function() {
            EngineVirtualStore.removeChangeListener(this._onChange);
        },

        shouldComponentUpdate: function(nextProps, nextState) {
            if(nextState.engine.chat.length != this.listLength) {
                this.listLength = nextState.engine.chat.length;
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

        _onChange: function() {
                this.setState(getState());
        },

        _sendMessage: function(e) {
            if(e.keyCode == 13) {
                var msg = this.refs.input.getDOMNode().value;
                if(msg.length > 1 && msg.length < 500){
                    this._say(msg);
                    this.refs.input.getDOMNode().value = '';
                }
            }
        },

        _say: function(msg) {
            ChatActions.say(msg);
        },

        render: function() {
            var self = this;
            var messages = this.state.engine.chat.map(renderMessage, self);
            var chatInput;

            if (this.state.engine.username)
                chatInput = D.input(
                    { className: 'chat-input',
                        onKeyDown: this._sendMessage,
                        ref: 'input',
                        placeholder: 'Type here...'
                    }
                );
            else
                chatInput = D.input(
                    { className: 'chat-input',
                        onKeyDown: this._sendMessage,
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
        }
    });

});