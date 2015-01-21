/**
 * This view acts as a wrapper for all the other views in the game
 * it is subscribed to changes in EngineVirtualStore but it only
 * listen to connection changes so every view should subscribe to
 * EngineVirtualStore independently.
 */
define([
    'lib/react',
    'components/Chart',
    'components/Controls',
    'components/TabsSelector',
    'components/Players',
    'components/BetBar',
    'stores/EngineVirtualStore'
], function(
    React,
    ChartClass,
    ControlsClass,
    TabsSelectorClass,
    PlayersClass,
    BetBarClass,
    EngineVirtualStore
){
    var Chart = React.createFactory(ChartClass);
    var Controls  = React.createFactory(ControlsClass);
    var TabsSelector = React.createFactory(TabsSelectorClass);
    var Players = React.createFactory(PlayersClass);
    var BetBar = React.createFactory(BetBarClass);

    var D = React.DOM;

    function getState() {
        var s = EngineVirtualStore.getState();
        return {
            isConnected: s.isConnected,
            maxWin: s.maxWin
        };
    }

    return React.createClass({
        displayName: 'Game',

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            EngineVirtualStore.addChangeListener(this._onChange);
        },

        componentWillUnmount: function() {
            EngineVirtualStore.removeChangeListener(this._onChange);
        },

        _onChange: function() {
            if (this.isMounted())
                this.setState(getState());
        },

        render: function() {
            if (!this.state.isConnected)
                return D.p(null, 'Connecting to server..');

            return D.div({ className: 'content' },
                D.div({ className: 'grid grid-pad' },
                    D.div({ className: 'col-7-12 game' },
                        D.div( { className: 'chart', style: { position: 'relative' } },
                            D.div({ style: { position: 'absolute', bottom: '27px', right: '30px', fontSize: '55%', backgroundColor: 'white' }},
                                'Max profit: ', (this.state.maxWin/1e8).toFixed(4), ' BTC'),
                            Chart()
                        ),
                        Controls()
                    ),
                    D.div({ className: 'col-5-12 tabs' },
                        D.div({ className: 'players' },
                            Players()
                        ),
                        D.div({ className: 'bet-bar' },
                            BetBar()
                        ),
                        D.div({ className: 'log-chat' },
                            TabsSelector()
                        )
                    )

                )
            )
        }
    });

});