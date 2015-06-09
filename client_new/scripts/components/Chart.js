define([
    'react',
    'game-logic/clib',
    'components/Graph',
    'game-logic/engine'
], function(
    React,
    Clib,
    GraphClass,
    Engine
){

    var D = React.DOM;

    var Graph = new GraphClass();

    function getState(){
        return {
            engine: Engine
        }
    }

    return React.createClass({
        displayName: 'Chart',

        getInitialState: function () {
            var state = getState();
            state.nyan = false;
            return state;
        },

        getThisElementNode: function() {
            return this.getDOMNode();
        },

        componentDidMount: function() {
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                lag_change: this._onChange,
                nyan_cat_animation: this._onNyanAnim
            });

            var canvasNode = this.refs.canvas.getDOMNode();
            Graph.startRendering(canvasNode, this.getThisElementNode);
        },

        componentWillUnmount: function() {
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                lag_change: this._onChange,
                nyan_cat_animation: this._onNyanAnim
            });
            Graph.stopRendering();
        },

        _onChange: function() {
            if(this.state.nyan === true && Engine.gameState !== 'IN_PROGRESS')
                this.setState({ nyan: false });

            if(this.isMounted())
                this.setState(getState());
        },

        _onNyanAnim: function() {
            this.setState({ nyan: true });
        },

        render: function() {

            return D.div({ id: 'chart-inner-container', ref: 'container' },
                D.div({ className: 'anim-cont' },
                    D.div({ className: 'nyan' + (this.state.nyan? ' show' : '') },
                        this.state.nyan? D.img({ src: 'img/nyan.gif' }) : null
                    )
                ),
                D.div({ className: 'max-profit' },
                    'Max profit: ', (this.state.engine.maxWin/1e8).toFixed(4), ' BTC'),
                D.canvas({ ref: 'canvas' })
            )
        }
    });
});