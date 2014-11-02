define(['lib/react', 'lib/clib', 'components2/payout'], function(React, Clib, Payout) {
    var initialDisableTime = 500; //The time the button is disabled after cashing out and after the game crashes

    var D = React.DOM;

    return React.createClass({
        displayName: 'BetButton',

        propTypes: {
            engine: React.PropTypes.object.isRequired,
            invalidBet: React.PropTypes.func.isRequired,
            placeBet: React.PropTypes.func.isRequired
        },

        getInitialState: function() {
            return {
                initialDisable: true
            }
        },

        componentDidMount: function() {
            var self = this;
            setTimeout(function() {
                if(self.isMounted())
                    self.setState({ initialDisable: false });
            }, initialDisableTime);
        },

        //Returns the button to cancel the bet or the message of sending bet
        getSendingBet: function () {
            var cancel;
            if (this.props.engine.gameState !== 'STARTING')
                cancel = D.a({ onClick: this.props.engine.cancelBet.bind(this.props.engine) }, 'cancel');

            return D.span(null, 'Sending bet...', cancel);
        },

        render: function() {
            var self = this;

            // If betting (a bet is queued or the user already bet and the game has not started yet)
            if (this.props.engine.nextBetAmount || (this.props.engine.gameState === 'STARTING' && this.props.engine.userState === 'PLAYING')) {
                var aco = this.props.engine.nextAutoCashout;

                var bet;
                if(this.props.engine.lastBet == null)
                    bet = this.props.engine.nextBetAmount;
                else
                    bet = this.props.engine.lastBet;

                var msg = null;
                if(this.props.engine.nextAutoCashout)
                    msg = ' with auto cash-out at ' + (aco / 100) + 'x';

                return D.div({ className: 'cash-out' },
                    D.a({ className: 'big-button-disable unclick' },
                            'Betting ' + Clib.formatSatoshis(bet) + ' ' + Clib.grammarBits(bet), msg),
                    D.div({ className: 'cancel' }, this.getSendingBet())
                );

            //Timeout to avoid bet by accident
            } else if(this.state.initialDisable) {

                return D.div({ className: 'bet-button-container' },
                    D.a({ className: 'big-button-disable unclick unselect' }, 'Place Bet!'),
                    (invalidBet ? D.div({ className: 'invalid cancel' }, invalidBet) : null)
                );

            //User can place a bet
            } else {
                var invalidBet = this.props.invalidBet();

                var button;
                if (invalidBet || this.props.engine.placingBet) {
                    button = D.a({ className: 'big-button-disable unclick unselect' }, 'Place Bet!');
                    return D.div({ className: 'bet-button-container' },
                        button,
                        (invalidBet ? D.div({ className: 'invalid cancel' }, invalidBet) : null)
                    );
                } else {
                    button = D.a({ className: 'big-button unselect' }, 'Place Bet!');
                    return D.div({ className: 'bet-button-container', onClick: self.props.placeBet },
                        button,
                        (invalidBet ? D.div({ className: 'invalid cancel' }, invalidBet) : null)
                    );
                }
            }
        }
    });
});