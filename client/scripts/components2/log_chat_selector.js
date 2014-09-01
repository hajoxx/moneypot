define(['lib/react', 'components2/chat', 'components2/games_log'], function(React, Chat, GamesLog) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'logChatSelector',

        propTypes: {
            engine: React.PropTypes.object.isRequired
        },

        getInitialState: function() {
            return {
                widget: 'gamesLog' //Widgets: chat, gamesLog
            }
        },

        selectWidget: function(widget) {
            var self = this;
            return function() {
                self.setState({ widget: widget });
            }
        },

        render: function() {

            return D.div({ className: 'log-chat-tabs-container' },
                D.ul({ className: 'chat-log-tabs unselect' },
                    D.li({
                            className: 'chat-log-tab ' + ((this.state.widget === 'gamesLog') ? 'tab-active' : ''),
                            onClick: this.selectWidget('gamesLog')
                        },
                        D.a(null, 'History')
                    ),
                    D.li({
                            className: 'chat-log-tab ' + ((this.state.widget === 'usersPlaying') ? 'tab-active' : ''),
                            onClick: this.selectWidget('usersPlaying')
                        },
                        D.a(null, 'Chat')
                    )
                ),
                D.div({ className: 'log-chat-container ' + ((this.state.widget == 'gamesLog')? 'scroll': '') },
                    (this.state.widget === 'gamesLog')? GamesLog({ engine: this.props.engine }) : Chat({ engine: this.props.engine })
                )
            );

        }
    });
});