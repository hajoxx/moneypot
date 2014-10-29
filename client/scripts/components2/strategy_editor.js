define(['lib/react', '../strategies/strategies', '../lib/lodash', '../lib/clib'], function(React, Strategies, _, Clib){

    var D = React.DOM;

    return React.createClass({
        displayName: 'strategyEditor',

        propTypes: {
            engine: React.PropTypes.object.isRequired,
            strategyController: React.PropTypes.object.isRequired
        },

        getInitialState: function() {
            this.controller = this.props.strategyController;
            return this.controller.getState();
        },

        componentDidMount: function() {
            this.controller.on('change', this.onChange);
        },

        componentWillUnmount: function() {
            this.controller.off('change', this.onChange);
        },

        onChange: function() {
            this.setState(this.controller.getState());
        },

        runStrategy: function() {
            this.props.strategyController.runStrategy(this.state.script, this.stopStrategy);
            this.controller.setActive(true);
        },

        stopStrategy: function() {
            this.controller.stopScript();
            if(this.isMounted())
                this.controller.setActive(false);
        },

        updateScript: function() {
            var script = this.refs.input.getDOMNode().value;
            this.controller.updateScript(script);
        },

        selectStrategy: function() {
            var strategyName = this.refs.strategies.getDOMNode().value;
            this.controller.selectStrategy(strategyName);
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
                D.select({ className: 'strategy-select', value: this.state.selectedStrategy,  onChange: self.selectStrategy, ref: 'strategies', disabled: this.state.active }, strategiesOptions)
            );
        }
    });
});