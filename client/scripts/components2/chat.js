define(['lib/react', 'lib/clib'], function(React, Clib) {
    var D = React.DOM;

    //Priorities:
    // -1. Bad
    //  0. Neutral
    //  1. Good
    //  2. Notice

    /* Constants */
    var SCROLL_OFFSET = 120;

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
            var messages = this.props.engine.chat.map(function(message, index) {
                var pri, fa;
                switch(message.pri) {
                    case -2:
                        pri = 'msg-bad';
                        fa = 'fa fa-bomb';
                        break;
                    case -1:
                        pri = 'msg-warn';
                        fa = 'fa fa-warning';
                        break;
                    case 0:
                        pri = 'msg-message';
                        fa = 'fa fa-dot-circle-o';
                        break;
                    case 1:
                        pri = 'msg-neutral';
                        fa = 'fa fa-spinner';
                        break;
                    case 2: //not sure what is it...
                        pri = 'msg-good';
                        fa = 'fa fa-money';
                        var bonus;
                        if (message.winner)
                            bonus = [D.span({ key: 'usr-txt'}, ' - User '), D.a({ href: '/user/' + message.winner, target: '_blank', key: 'usr-lnk' }, message.winner), D.span({ key: 'usr-bns' }, ' got ' + Clib.formatSatoshis(message.bonus) + ' bonus')];
                        else
                            bonus = null;
                        //return D.li({ className: pri , key: 'msg' + index }, ' Game crashed @ ' + message.payout, bonus );
                        break;
                    case 3:
                        pri = 'msg-notice';
                        fa = 'fa fa-gamepad';
                        break;
                    case 4:
                        pri = 'msg-game-info';
                        fa = 'fa fa-info';
                        return D.li({ className: pri + ' hint--bottom', key: 'msg' + index, rel: 'tooltip', 'data-hint': 'Click to copy game info', onClick: self.copyGameInfo(message) }, D.i({ className: fa }, null), ' ' + message.msg);
                    default:
                        pri = 'msg-chat-message';
                        fa = '';
                        return D.li({ className: pri , key: 'msg' + index }, D.i({ className: fa }, null), D.a({ href: '/user/' + message.username, target: '_blank' }, '<'+message.username+'>'), ' ' + message.message);
                        break;
                }
            });
            var chatInput;
            if(this.props.engine.username) //TODO: Engine should have a variable loggedIn or similar.
                chatInput = D.input({ className: 'chat-input', onKeyDown: this.sendMessage, ref: 'input', placeholder: 'Type here...' });
            else
                chatInput = D.input({ className: 'chat-input', onKeyDown: this.sendMessage, ref: 'input', placeholder: 'Log in to chat...', disabled: true });

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