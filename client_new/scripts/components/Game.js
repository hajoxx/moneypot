/**
 * This view acts as a wrapper for all the other views in the game
 * it is subscribed to changes in EngineVirtualStore but it only
 * listen to connection changes so every view should subscribe to
 * EngineVirtualStore independently.
 */
define([
    'react',
    'components/TopBar',
    'components/ChartControls',
    'components/TabsSelector',
    'components/Players',
    'components/BetBar',
    'components/SpaceWrap',
    'game-logic/engine',
    'game-logic/clib'
], function(
    React,
    TopBarClass,
    ChartControlsClass,
    TabsSelectorClass,
    PlayersClass,
    BetBarClass,
    SpaceWrapClass,
    Engine,
    Clib
){
    var TopBar = React.createFactory(TopBarClass);
    var SpaceWrap = React.createFactory(SpaceWrapClass);
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
                showMessage: true,
                isMobileOrSmall: Clib.isMobileOrSmall() //bool
            }
        },

        componentDidMount: function() {
            Engine.on({
                'connected': this._onChange,
                'disconnected': this._onChange
            });

            window.addEventListener("resize", this._onWindowResize);
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

        _onWindowResize: function() {
            var isMobileOrSmall = Clib.isMobileOrSmall();
            if(this.state.isMobileOrSmall !== isMobileOrSmall)
                this.setState({ isMobileOrSmall: isMobileOrSmall });
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
                            D.a({ href: "/request" }, "Welcome to bustabit.com, to start you have 2 free bits, bits you can request them here or you can just watch the current games... have fun :D")
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

            var rightContainer = !this.state.isMobileOrSmall?
                D.div({ id: 'game-right-container' },
                    Players(),
                    BetBar()
                ) : null;

            return D.div({ id: 'game-inner-container' },

                TopBar({
                    isMobileOrSmall: this.state.isMobileOrSmall
                }),

                SpaceWrap(),

                messageContainer,

                D.div({ id: 'game-playable-container', className: containerClass },
                    D.div({ id: 'game-left-container', className: this.state.isMobileOrSmall? ' small-window' : '' },
                        D.div({ id: 'chart-controls-row' },
                            D.div({ id: 'chart-controls-col' },
                                ChartControls({
                                    isMobileOrSmall: this.state.isMobileOrSmall
                                })
                            )

                        ),
                        D.div({ id: 'tabs-controls-row' },
                            D.div({ id: 'tabs-controls-col' },
                                TabsSelector()
                            )
                        )

                    ),
                    rightContainer
                )
            );
        }
    });

});