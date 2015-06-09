define([
    'react',
    'game-logic/engine'
], function(
    React,
    Engine
) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'SpaceWrap',

        getInitialState: function() {
            return {
                spaceMode: (Engine.gameState === 'IN_PROGRESS')? 'flying' : 'waiting'
            }
        },

        componentDidMount: function() {
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange
            });
        },

        componentWillUnmount: function() {
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange
            });
        },

        _onChange: function() {
            this.setState({ spaceMode: (Engine.gameState === 'IN_PROGRESS')? 'flying' : 'waiting' });
        },

        render: function() {
            return D.div({ id:'space-wrap', className: 'space-wrap ' + this.state.spaceMode },
                D.div({ className: 'space-gradient' }),
                D.div({ className: 'space-container-wrap'},
                    D.div({ className: 'space-container' })
                )
            );
        }
    });
});