define(['lib/react', 'lib/clib', 'components2/payout', 'components2/countdown'],

    function(React, Clib, Payout, Countdown) {
        var D = React.DOM;

        return React.createClass({
            displayName: 'Controls',

            propTypes: {
                engine: React.PropTypes.object.isRequired
            },

            getInitialState: function() {
                return {
                    bet_size: '1', // in bits
                    cash_out: '2.00' // in multiplier
                }
            },

            invalidBet: function() {

                var self = this;
                if (self.props.engine.balanceSatoshis < 100)
                    return 'Not enough bits to play';

                var bet = parseFloat(self.state.bet_size); // in bits..

                if (Number.isNaN(bet) || bet < 1 || Math.floor(bet) !== bet)
                    return 'The bet should be an integer greater than or equal to one';

                if (bet > 1e5)
                    return 'The bet must be less no more than 100,000 bits';

                var ac =


                if (self.props.engine.balanceSatoshis < bet * 100)
                    return 'Not enough bits';

                return null;

            },

            placeBet: function() {
                var bet = parseFloat(this.state.bet_size);
                console.assert(Number.isFinite(bet));

                bet = Math.round(bet * 100);
                var cashOut = parseFloat(this.state.cash_out);
                console.assert(Number.isFinite(cashOut));
                cashOut = Math.round(cashOut * 100);


                this.props.engine.bet(bet, cashOut, function (err) {
                    if (err) {
                        console.error('Got betting error: ', err);
                    }
                });

            },

            cashOut: function() {
                this.props.engine.cashOut(function(err) {
                    if (err) {
                        console.warn('Got cash out error: ', err);
                    }
                });
            },

            cancelPlaceBet: function() {
                throw new Error('todo cancel place bet!');
            },

            toggleAutoPlay: function() {
                var to = !this.props.engine.autoPlay;
                this.props.engine.setAutoPlay(to);
            },

            getStatusMessage: function() {
                if (this.props.engine.gameState === 'STARTING') {
                    console.log('showing starting...');
                    return Countdown({ engine: this.props.engine });
                }

                if (this.props.engine.gameState === 'IN_PROGRESS') {
                    //user is playing
                    if (this.props.engine.userState === 'PLAYING') {
                        return D.span(null, 'Currently playing...');
                    } else if (this.props.engine.lastGameWonAmount) { // user has cashed out
                        return D.span(null, 'Cashed Out @  ',
                                D.b({className: 'green'}, (this.props.engine.lastGameWonAmount / this.props.engine.lastBet), 'x'),
                                ' / Won: ',
                                D.b({className: 'green'}, Clib.formatSatoshis(this.props.engine.lastGameWonAmount)),
                                ' ', grammarBits(this.props.engine.lastGameWonAmount)
                            );

                    } else { // user still in game
                        return D.span(null, 'Game in progress..');
                    }
                } else if (this.props.engine.gameState === 'ENDED') {
                    console.log('sm: ended');

                    if (this.props.engine.lastBet && this.props.engine.lastGameWonAmount) { // bet and won
                        console.log('sm: bet and won');

                        var bonus;
                        if (this.props.engine.lastBonus) {
                            bonus = D.span(null, D.br(), ' (+',
                                Clib.formatSatoshis(this.props.engine.lastBonus), ' ',
                                grammarBits(this.props.engine.lastBonus), ' bonus)'
                            );
                        }

                        return D.span(null, 'Cashed Out @ ',
                            D.b({className: 'green'}, (this.props.engine.lastGameWonAmount / this.props.engine.lastBet), 'x'),
                            ' / Won: ',
                            D.b({className: 'green'}, Clib.formatSatoshis(this.props.engine.lastGameWonAmount)),
                            ' ', grammarBits(this.props.engine.lastGameWonAmount),
                            bonus
                        );
                    } else if (this.props.engine.lastBet) { // bet and lost
                        console.log('sm: bet and lost');

                        var bonus;
                        if (this.props.engine.lastBonus) {
                            bonus = D.span(null, D.br(), '..but got a ',
                                Clib.formatSatoshis(this.props.engine.lastBonus), ' ',
                                grammarBits(this.props.engine.lastBonus), ' bonus'
                            );
                        }

                        return D.span(null,
                            'Game crashed @ ', D.b({className: 'red'}, this.props.engine.lastGameCrashedAt/100, 'x'),
                            ' / You lost ',  D.b({className: 'red'}, this.props.engine.lastBet), ' ', grammarBits(this.props.engine.lastBet),
                            bonus
                        );
                    } else { // didn't bet
                        return D.span(null,
                            'Game crashed @ ', D.b({className: 'red'}, this.props.engine.lastGameCrashedAt/100, 'x')
                        );
                    }

                }
            },

            getBetter: function() {
                var self = this;

                var invalidBet = self.invalidBet();

                var button;
                if (invalidBet)
                    button = D.a({className: 'big-button-disable unclick unselect' }, 'Place Bet!');
                else
                    button = D.a({className: 'big-button unselect', onClick: self.placeBet }, 'Place Bet!');

                var cashOut  = D.div(null,
                    D.div({ className: 'auto-cash-out-span' }, 'Auto Cash Out @ '),
                    D.input({
                        min: 1.1,
                        value: self.state.cash_out,
                        type: 'number',
                        name: 'cash_out',
                        onChange: function(e) {
                            self.setState({ cash_out: e.target.value })
                        }
                    }),
                    D.span({ className: 'sticky' }, 'x')
                );


                return D.div(null,
                    D.div({ className: 'col-6-12' },
                        D.div({ className: 'left-side unselect' },
                            D.span({ className: 'bet-span strong' }, 'Bet'),
                            D.input({
                                type: 'number',
                                name: 'bet-size', min: 1,
                                value: self.state.bet_size,
                                onChange: function(e) {
                                    self.setState({ bet_size: e.target.value })
                                }
                            }),
                            D.span({ className: 'sticky' }, 'Bits')
                        )
                    ),
                    D.div({ className: 'col-6-12 place-bet'},
                        button,
                        (invalidBet ? D.div({className: 'invalid cancel'}, self.invalidBet) : null)
                    ),
                    cashOut
                );
            },

            getBetting: function() {
                var bet = this.props.engine.nextBetAmount;
                var aco = this.props.engine.nextAutoCashout;

                var msg = ' with auto cash-out at ' + (aco / 100) + 'x';

                return D.div({ className: 'cash-out' },
                    D.a({className: 'big-button-disable unclick' },
                            'Betting ' + Clib.formatSatoshis(bet) + ' ' + grammarBits(bet), msg),
                    D.div({className: 'cancel'}, 'Sending bet...')
                );
            },

            getAutoCashOutMessage: function() {
                console.assert(this.props.engine.autoCashOut);
                return D.div({className: 'cancel'}, ' / Auto cash out at ' + (this.props.engine.autoCashOut / 100) + 'x');
            },

            getCashOut: function() {

                return D.div({ className: 'cash-out' },
                    D.a({className: 'big-button unclick', onClick: this.cashOut },
                        'Cash out at ', Payout({engine: this.props.engine}), ' bits'
                    ),
                    D.div({className: 'cancel'}, this.getAutoCashOutMessage())
                );
            },

            getContents: function() {
                console.log('next bet amount: ', this.props.engine.nextBetAmount);
                if (this.props.engine.gameState === 'IN_PROGRESS' && this.props.engine.userState === 'PLAYING') {
                    return this.getCashOut();
                } else if (this.props.engine.nextBetAmount || // a bet is queued
                    (this.props.engine.gameState === 'STARTING' && this.props.engine.userState === 'PLAYING')
                 ) {
                    return this.getBetting();
                } else { // user can place a bet
                    return this.getBetter();
                }
            },

            render: function() {
                console.log(this.props.engine.gameState, ' -> ', this.props.engine.userState);

                var self = this;

                // If they're not logged in, let just show a login to play
                if (!this.props.engine.username)
                    return D.div({ className: 'grid grid-pad' },
                        D.div({ className: 'controls'},
                            D.div({className: 'login'}, D.a({className: 'big-button unselect', href: '/login' }, 'Login to play'),
                                D.a({href: '/register', className: 'register'}, 'or register ')
                            )
                        )
                    );

                //finally... the render
                return  D.div({ className: 'grid grid-pad ' },
                    D.div({ className: 'controls'},
                        D.h5({ className: 'information'},
                            this.getStatusMessage()
                        ),
                        this.getContents()
                    ),
                    D.div({ className: 'game-hash'},
                        'Hash: ',
                        D.a({href:"/faq#fair", target: 'blank'}, this.props.engine.hash)
                    ),
                    D.div({ className: 'auto-bet' },
                        D.label(null,
                            D.input({
                                type: 'checkbox',
                                name: 'autoplay',
                                onChange: this.toggleAutoPlay,
                                checked: this.props.engine.autoPlay,
                                disabled: this.invalidBet()
                            }),
                            'auto bet'
                        )
                    )
                );
            }
        });


        //Returns plural or singular, for a given amount of bits.
        function grammarBits(bits) {
            return bits <= 100 ? 'bit' : 'bits';
        }
    }


);
