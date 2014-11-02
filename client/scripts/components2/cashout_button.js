define(['lib/react', 'lib/clib', 'components2/payout'], function(React, Clib, Payout) {

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
            var self = this;
            var invalidBet = this.props.invalidBet();

        if (this.props.engine.cashingOut) {
                return D.div({ className: 'cash-out' },
                    D.a({ className: 'big-button-disable unclick' },
                        'Cash out at ', Payout({ engine: this.props.engine }), ' bits'
                    )
                );
            } else if (this.props.engine.gameState === 'IN_PROGRESS' && this.props.engine.userState === 'PLAYING') {
                return D.div({ className: 'cash-out', onMouseDown: this.cashOut },
                    D.a({ className: 'big-button unclick' },
                        'Cash out at ', Payout({ engine: this.props.engine }), ' bits'
                    )
                );
            }
        }
    });
});
