define(['lib/react', 'strategies/strategies', 'lib/lodash', 'lib/clib'], function(React, Strategies, _, Clib){

    var D = React.DOM;

    return React.createClass({
        displayName: 'strategyEditor',

        propTypes: {
            engine: React.PropTypes.object.isRequired,
            strategyController: React.PropTypes.object.isRequired
        },

        controller: function() {
            //Avoid having a static reference to the controller by creating a getter instead of saving it in a variable
            return this.props.strategyController;
        },

        getState: function() {
            var state = this.controller().getState();
            state.invalidData = this.controller().dataInvalid();
            return state;
        },

        getInitialState: function() {
            //The state is duplicated with the one in the controller but we do not modify it from here
            //its just to let react render efficiently, this is the way FLUX do it.
            return this.getState();
        },

        componentDidMount: function() {
            this.controller().on('change', this.onChange);
        },

        componentWillUnmount: function() {
            this.controller().off('change', this.onChange);
        },

        onChange: function() {
            this.setState(this.getState());
        },

        runStrategy: function() {
            this.controller().runStrategy();
        },

        stopStrategy: function() {
            this.controller().stopScript();
        },

        updateScript: function() {
            var script = this.refs.input.getDOMNode().value;
            this.controller().updateScript(script);
        },

        selectStrategy: function() {
            var strategyName = this.refs.strategies.getDOMNode().value;
            this.controller().selectStrategy(strategyName);
        },

        render: function() {
            var self = this;

            var strategiesOptions =_.map(Strategies, function(strategy, strategyName) {
                return D.option({ value: strategyName, key: 'strategy_'+strategyName }, Clib.capitaliseFirstLetter(strategyName));
            });

            return D.div({ className: 'strategy-container' },

                //If the strategy is not a script should be a widget function and we mount it
                (typeof this.state.strategy == 'function')?
                    this.state.strategy({ strategyController: this.props.strategyController }):
                    D.textarea({ className: 'strategy-input', ref: 'input', value: self.state.strategy, onChange: self.updateScript, disabled: this.state.active }),

                D.button({ className: 'strategy-start', onClick: self.runStrategy, disabled: this.state.active || this.state.invalidData }, 'RUN!'),
                D.button({ className: 'strategy-stop', onClick: self.stopStrategy, disabled: !this.state.active }, 'STOP'),
                D.select({ className: 'strategy-select', value: this.state.selectedStrategy,  onChange: self.selectStrategy, ref: 'strategies', disabled: this.state.active }, strategiesOptions),
                D.span({ className: 'strategy-invalid-data' }, this.state.invalidData)
            );
        }
    });
});