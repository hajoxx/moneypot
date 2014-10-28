define(['lib/react', '../engine-controller', '../strategies/strategies-min', '../lib/lodash', '../lib/clib'], function(React, EngineController, Strategies, _, Clib){

    var D = React.DOM;

    return React.createClass({
        displayName: 'strategyEditor',

        getInitialState: function() {
            return {
                active: false,
                script: Strategies.custom
            }
        },

        propTypes: {
            engine: React.PropTypes.object.isRequired
        },

        runStrategy: function() {
            this.engineController = new EngineController(this.props.engine, this.state.script, this.stopStrategy);
            this.setState({ active: true });
        },

        stopStrategy: function() {
            this.engineController.stop();
            if(this.isMounted()) {
                this.setState({ active: false });
            }
        },

        updateScript: function() {
            var script = this.refs.input.getDOMNode().value;
            this.setState({ script: script });
        },

        selectStrategy: function() {
            var strategyName = this.refs.strategies.getDOMNode().value;
            this.setState({ script: Strategies[strategyName] });
        },

        render: function() {
            var self = this;

            var strategiesOptions =_.map(Strategies, function(strategy, strategyName) {
                return D.option({ value: strategyName, key: 'strategy_'+strategyName }, Clib.capitaliseFirstLetter(strategyName));
            });

            return D.div({ className: 'strategy-container' },
                D.textarea({ className: 'strategy-input', ref: 'input', value: self.state.script, onChange: self.updateScript, disabled: this.state.active }),
                D.button({ className: 'strategy-start', onClick: self.runStrategy, disabled: this.state.active }, 'RUN!'),
                D.button({ className: 'strategy-stop', onClick: self.stopStrategy, disabled: !this.state.active }, 'STOP'),
                D.select({ className: 'strategy-select',  onChange: self.selectStrategy, ref: 'strategies', disabled: this.state.active }, strategiesOptions)

            );
        }
    });
});