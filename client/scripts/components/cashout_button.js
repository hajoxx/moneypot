define(['lib/react', 'lib/clib', 'components/payout'], function(React, Clib, Payout) {

    var D = React.DOM;

    return React.createClass({
        displayName: 'CashoutButton',

        propTypes: {
            engine: React.PropTypes.object.isRequired,
            invalidBet: React.PropTypes.func.isRequired
        },

        cashOut: function () {
            var self = this;
            this.props.engine.cashOut(function (err) {
                if (err)
                    console.warn('Got cash out error: ', err);
            });
        },

        render: function() {

            if (this.props.engine.cashingOut) {
                return D.div({ className: 'cash-out' },
                    D.a({ className: 'big-button-disable unclick' },
                        'Cash out at ', Payout({ engine: this.props.engine }), ' bits'
                    )
                );
            } else {
                return D.div({ className: 'cash-out', onMouseDown: this.cashOut },
                    D.a({ className: 'big-button unclick' },
                        'Cash out at ', Payout({ engine: this.props.engine }), ' bits'
                    )
                );
            }
        }
    });
});
