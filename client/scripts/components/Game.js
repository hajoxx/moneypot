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
    'stores/EngineVirtualStore'
], function(
    React,
    ChartClass,
    ControlsClass,
    TabsSelectorClass,
    PlayersClass,
    EngineVirtualStore
){
    var Chart = React.createFactory(ChartClass);
    var Controls  = React.createFactory(ControlsClass);
    var TabsSelector = React.createFactory(TabsSelectorClass);
    var Players = React.createFactory(PlayersClass);

    var D = React.DOM;

    function getState() {
        return {
            isConnected: EngineVirtualStore.getState().isConnected
        }
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
            var isConnected = getState().isConnected;
            if(this.state.isConnected != isConnected)
                this.setState({ isConnected: isConnected });
        },

        render: function() {
            if (!this.state.isConnected)
                return D.p(null, 'Connecting to server..');

            return D.div({ className: 'content' },
                D.div({ className: 'grid grid-pad' },
                    D.div({ className: 'col-7-12 game' },
                        D.div( { className: 'chart' },
                            Chart()
                        ),
                        Controls()
                    ),
                    D.div({ className: 'col-5-12 tabs' },
                        D.div({ className: 'players' },
                            Players()
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