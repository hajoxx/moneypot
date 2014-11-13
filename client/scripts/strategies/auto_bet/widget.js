define(['lib/react', 'lib/react-radio'], function(React, ReactRadio) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'AutoBetWidget',

        propTypes: {
            strategyController: React.PropTypes.object.isRequired
        },

        controller: function() {
            //Shortcut as getter to avoid saving a reference of a prop that could potentially change
            return this.props.strategyController;
        },

        getState: function() {
            var state = this.controller().getWidgetState();
            state.active = this.controller().getEditorState();
            return state;
        },

        getInitialState: function() {
            //Set the initial state
            return this.getState();
        },

        componentDidMount: function() {
            this.controller().on('widget_change', this.onChange);
        },

        componentWillUnmount: function() {
            this.controller().off('widget_change', this.onChange);
        },

        onChange: function() {
            this.setState(this.getState());
        },

        updateOnLoss: function(opt) {
            this.controller().setWidgetState('onLossSelectedOpt', opt);
        },

        updateOnWin: function(opt) {
            this.controller().setWidgetState('onWinSelectedOpt', opt);
        },

        updateBetAmount: function() {
            var amount = this.refs.bet_amount.getDOMNode().value;
            this.controller().setWidgetState('baseBet', amount);
        },

        updateAutoCashAt: function() {
            var amount = this.refs.auto_cash_at.getDOMNode().value;
            this.controller().setWidgetState('autoCashAt', amount);
        },

        updateOnLossQty: function() {
            var amount = this.refs.onLossQty.getDOMNode().value;
            this.controller().setWidgetState('onLossIncreaseQty', amount);
        },

        updateOnWinQty: function() {
            var amount = this.refs.onWinQty.getDOMNode().value;
            this.controller().setWidgetState('onWinIncreaseQty', amount);
        },

        render: function() {
            return D.div({ className: 'widget-container' },
                D.div({ className: 'stra-base-bet' },
                    D.span({ className: 'widget-title' }, 'Base Bet: '),
                    D.input({ type: 'text', ref: 'bet_amount', onChange: this.updateBetAmount, value: this.state.baseBet, disabled: this.state.active }),
                    D.span(null, 'Bits')
                ),
                D.div({ className: 'stra-cash-out-at' },
                    D.span({ className: 'widget-title' }, 'Auto Cashout at:'),
                    D.input({ type: 'text', ref: 'auto_cash_at', onChange: this.updateAutoCashAt, value: this.state.autoCashAt, disabled: this.state.active }),
                    D.span(null, 'x')
                ),
                D.div({ className: 'stra-on-loss' },
                    D.span({ className: 'widget-title' }, 'On loss:'),
                    ReactRadio({ name: 'onLoss', onChange: this.updateOnLoss, defaultValue: this.state.onLossSelectedOpt  },
                        D.input({
                            type: 'radio',
                            className: 'stra-on-loss-return-to-base-radio',
                            value: 'return_to_base',
                            disabled: this.state.active
                        },  D.span(null, 'Return to base bet'),
                            D.br()
                        ),
                        D.input({
                            type: 'radio',
                            className: 'stra-on-loss-increase-bet-by',
                            value: 'increase_bet_by',
                            disabled: this.state.active
                        },  D.span(null, 'Increase bet by: '),
                            D.input({
                                type: 'text',
                                ref: 'onLossQty',
                                onChange: this.updateOnLossQty,
                                value: this.state.onLossIncreaseQty,
                                disabled: this.state.active || this.state.onLossSelectedOpt != 'increase_bet_by' }
                            ),
                            D.span(null, 'x')
                        )
                    )
                ),
                D.div({ className: 'stra-on-win' },
                    D.span({ className: 'widget-title' }, 'On win:'),
                    ReactRadio({ name: 'onWin', onChange: this.updateOnWin, defaultValue: this.state.onWinSelectedOpt },
                        D.input({
                            type: 'radio',
                            className: 'stra-on-win-return-to-base-radio',
                            value: 'return_to_base',
                            disabled: this.state.active
                        },  D.span(null, 'Return to base bet'),
                            D.br()
                        ),
                        D.input({
                            type: 'radio',
                            className: 'stra-on-win-increase_bet_by',
                            value: 'increase_bet_by',
                            disabled: this.state.active
                        },  D.span(null, 'Increase bet by: '),
                            D.input({
                                type: 'text',
                                ref: 'onWinQty',
                                onChange: this.updateOnWinQty,
                                value: this.state.onWinIncreaseQty,
                                disabled: this.state.active || this.state.onWinSelectedOpt != 'increase_bet_by' }
                            ),
                            D.span(null, 'x')
                        )
                    )
                )
            );
        }

    });

});