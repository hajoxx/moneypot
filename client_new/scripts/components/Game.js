/**
 * This view acts as a wrapper for all the other views in the game
 * it is subscribed to changes in EngineVirtualStore but it only
 * listen to connection changes so every view should subscribe to
 * EngineVirtualStore independently.
 */
define([
    'lib/react',
    'components/Chart-Controls',
    'components/TabsSelector',
    'components/Players',
    'components/BetBar',
    'game-logic/engine'
], function(
    React,
    ChartControlsClass,
    TabsSelectorClass,
    PlayersClass,
    BetBarClass,
    Engine
){
    var ChartControls = React.createFactory(ChartControlsClass);
    var TabsSelector = React.createFactory(TabsSelectorClass);
    var Players = React.createFactory(PlayersClass);
    var BetBar = React.createFactory(BetBarClass);

    var D = React.DOM;

    return React.createClass({
        displayName: 'Game',

        getInitialState: function () {
            return {
                isConnected: Engine.isConnected,
                showMessage: true
            }
        },

        componentDidMount: function() {
            Engine.on({
                'connected': this._onChange,
                'disconnected': this._onChange
            });
        },

        componentWillUnmount: function() {
            Engine.off({
                'connected': this._onChange,
                'disconnected': this._onChange
            });
        },

        _onChange: function() {
            if(this.state.isConnected != Engine.isConnected)
                this.setState({ isConnected: Engine.isConnected });
        },

        _hideMessage: function() {
            this.setState({ showMessage: false });
        },

        render: function() {
            if (!this.state.isConnected)
                return D.p(null, 'Connecting to server..');

            var messageContainer;
            if(USER_MESSAGE && this.state.showMessage) {

                var messageContent, messageClass, containerClass = 'show-message';
                switch(USER_MESSAGE.type) {
                    case 'error':
                        messageContent = D.span(null,
                                            D.span(null, USER_MESSAGE.text)
                        );
                        messageClass = 'error';
                        break;
                    case 'newUser':
                        messageContent = D.span(null,
                                            D.span(null, "Welcome to bustabit.com, to start you have 2 free bits, bits you can "),
                                            D.a({ href: "/request" }, "request"),
                                            D.span(null, " them here or you can just watch the current games... have fun :D")
                        );
                        messageClass = 'new-user';
                        break;
                    case 'received':
                        messageContent = D.span(null,
                            D.span(null, "Congratulations you have been credited " +  USER_MESSAGE.qty +  " free bits. Have fun!")
                        );
                        messageClass = 'received';
                        break;
                    case 'advice':
                        messageContent = D.span(null,
                            D.span(null, USER_MESSAGE.advice)
                        );
                        messageClass = 'advice';
                        break;
                    case 'collect':
                        messageContent = D.span(null,
                            D.a({ href: '/request' }, 'Collect your two free bits!')
                        );
                        messageClass = 'collect';
                        break;
                    default:
                        messageContent = null;
                        messageClass = 'hide';
                        containerClass = '';
                }

                messageContainer = D.div({ id: 'game-message-container', className: messageClass },
                    messageContent,
                    D.a({ className: 'close-message', onClick: this._hideMessage }, D.i({ className: 'fa fa-times' }))
                )
            } else {
                messageContainer = null;
                containerClass = '';
            }


            return D.div({ id: 'game-inner-container' },

                messageContainer,

                D.div({ id: 'game-playable-container', className: containerClass },
                    D.div({ id: 'game-left-container' },
                        D.div({ id: 'chart-controls-row' },
                            D.div({ id: 'chart-controls-col' },
                                ChartControls()
                            )

                        ),
                        D.div({ id: 'tabs-controls-row' },
                            D.div({ id: 'tabs-controls-col' },
                                TabsSelector()
                            )
                        )

                    ),
                    D.div({ id: 'game-right-container' },
                        Players(),
                        BetBar()
                    )
                )

            );

            //return D.div({ className: 'content' },
            //    D.div({ className: 'grid grid-pad' },
            //        D.div({ className: 'col-7-12 game' },
            //            Chart(),
            //            Controls()
            //        ),
            //        D.div({ className: 'col-5-12 tabs' },
            //            D.div({ className: 'players' },
            //                Players()
            //            ),
            //            D.div({ className: 'bet-bar' },
            //                BetBar()
            //            ),
            //            D.div({ className: 'log-chat' },
            //                TabsSelector()
            //            )
            //        )
            //
            //    )
            //)
        }
    });

});