define(['lib/react', 'components2/chart', 'components2/controls', 'components2/log_chat_selector', 'components2/players', 'components2/payout'],
    function(React, Chart, Controls, LogChatSelector, Players, Payout) {
        var D = React.DOM;

        return React.createClass( {
            displayName: 'Game',

            propTypes: {
                engine: React.PropTypes.object.isRequired
            },

            render: function() {
                if (!this.props.engine.isConnected)
                    return D.p(null, 'Connecting to server..');


                return D.div({ className: 'content' },
                    D.div({ className: 'grid grid-pad' },
                        D.div({ className: 'col-8-12 game' },
                            D.div( { className: 'chart' },
                                Chart({ engine: this.props.engine })
                            ),
                            Controls({ engine: this.props.engine })
                        ),
                        D.div({ className: 'col-4-12 tabs' },
                            D.div({ className: 'players' },
                                Players({ engine: this.props.engine })
                            ),
                            D.div({ className: 'log-chat' },
                                LogChatSelector({ engine: this.props.engine }) 
                            )
                        )
                    )
                )
            }
        });
    }
);
