define(['lib/react',
        'lib/clib',
        'lib/lodash',
        'components2/payout',
        'components2/countdown'],

    function (React, Clib, _, Payout, Countdown) {
        var D = React.DOM;

        return React.createClass({
            displayName: 'Controls',

            propTypes: {
                engine: React.PropTypes.object.isRequired
            },

            componentWillMount: function () {
                var self = this;
                self.props.engine.on('cancel_bet', function () {
                    self.setState({ auto_play: false });
                });
            },

            getInitialState: function () {
                return {
                    bet_size: '1', // in bits
                    cash_out: '2.00', // in multiplier
                    auto_play: false
                }
            },

            invalidBet: function () {

                var self = this;
                if (self.props.engine.balanceSatoshis < 100)
                    return 'Not enough bits to play';


                if (!/^\d+k*$/.test(self.state.bet_size))
                    return 'Bet may only contain digits, and k (to mean 1000)';

                var bet = parseInt(self.state.bet_size.replace(/k/g, '000'));

                if (bet < 1)
                    return 'The bet should be at least 1 bit';

                if (bet > 1e5)
                    return 'The bet must be less no more than 100,000 bits';

                var co = self.state.cash_out;

                if (!/^\d+(\.\d{1,2})?$/.test(co)) {
                    return 'Invalid auto cash out amount';
                }

                co = parseFloat(co);
                console.assert(!_.isNaN(co));


                if (_.isNaN(bet) || co < 1 || Math.floor(bet) !== bet)
                    return 'The bet should be an integer greater than or equal to one';


                if (self.props.engine.balanceSatoshis < bet * 100)
                    return 'Not enough bits';

                return null;

            },

            placeBet: function () {

                var bet = parseInt(this.state.bet_size.replace(/k/g, '000')) * 100;
                console.assert(_.isFinite(bet));

                var cashOut = parseFloat(this.state.cash_out);
                console.assert(_.isFinite(cashOut));
                cashOut = Math.round(cashOut * 100);

                console.assert(_.isFinite(cashOut));

                this.props.engine.bet(bet, cashOut, this.state.auto_play, function (err) {
                    if (err) {
                        console.error('Got betting error: ', err);
                    }
                });

            },

            cashOut: function () {
                this.props.engine.cashOut(function (err) {
                    if (err) {
                        console.warn('Got cash out error: ', err);
                    }
                });
            },

            getStatusMessage: function () {
                if (this.props.engine.gameState === 'STARTING') {
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
                            'Game crashed @ ', D.b({className: 'red'}, this.props.engine.lastGameCrashedAt / 100, 'x'),
                            ' / You lost ', D.b({className: 'red'}, this.props.engine.lastBet / 100), ' ', grammarBits(this.props.engine.lastBet),
                            bonus
                        );
                    } else { // didn't bet
                        return D.span(null,
                            'Game crashed @ ', D.b({className: 'red'}, this.props.engine.lastGameCrashedAt / 100, 'x')
                        );
                    }

                }
            },

            getSendingBet: function () {
                var cancel;
                if (this.props.engine.gameState !== 'STARTING')
                    cancel = D.a({ onClick: this.props.engine.cancelBet.bind(this.props.engine) }, 'cancel');

                return D.span(null, 'Sending bet...', cancel);
            },

            toggleAutoPlay: function () {
                var prev = this.state.auto_play;
                if (prev) this.props.engine.cancelAutoPlay();
                this.setState({ auto_play: !prev });
            },


            copyHash: function () {
                prompt('Game ' + this.props.engine.gameId + ' hash:', this.props.engine.hash);
            },

            /** Bet button **/
            getBetButton: function () {
                var self = this;

                if (this.props.engine.gameState === 'IN_PROGRESS' && this.props.engine.userState === 'PLAYING') {
                    return D.div({ className: 'cash-out', onClick: this.cashOut },
                        D.a({className: 'big-button unclick' },
                            'Cash out at ', Payout({engine: this.props.engine}), ' bits'
                        )
                    );
                } else if (this.props.engine.nextBetAmount || // a bet is queued
                      (this.props.engine.gameState === 'STARTING' && this.props.engine.userState === 'PLAYING')
                    )
                {
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
                        D.a({className: 'big-button-disable unclick' },
                                'Betting ' + Clib.formatSatoshis(bet) + ' ' + grammarBits(bet), msg),
                        D.div({className: 'cancel'}, this.getSendingBet())
                    );

                    //User can place a bet
                } else {
                    var invalidBet = this.invalidBet();

                    var button;
                    if (invalidBet)
                        button = D.a({className: 'big-button-disable unclick unselect' }, 'Place Bet!');
                    else
                        button = D.a({className: 'big-button unselect' }, 'Place Bet!');

                    return D.div({ onClick: self.placeBet },
                        button,
                        (invalidBet ? D.div({className: 'invalid cancel'}, invalidBet) : null)
                    );
                }
            },

            /** Control Inputs **/
            getControlInputs: function () {
                var self = this;

                var betInput = D.div(null,
                    D.span({ className: 'bet-span strong' }, 'Bet'),
                    D.input({
                        type: 'text',
                        name: 'bet-size',
                        value: self.state.bet_size,
                        onChange: function (e) {
                            self.setState({ bet_size: e.target.value })
                        }
                    }),
                    D.span({ className: 'sticky' }, 'Bits')
                );

                var autoCashOut = D.div(null,
                    D.div({ className: 'auto-cash-out-span' }, 'Auto Cash Out @ '),
                    D.input({
                        min: 1.1,
                        value: self.state.cash_out,
                        type: 'number',
                        name: 'cash_out',
                        onChange: function (e) {
                            self.setState({ cash_out: e.target.value })
                        }
                    }),
                    D.span({ className: 'sticky' }, 'x')
                );


                return D.div({ className: 'inputs-cont grid grid-pad' },
                    D.div({ className: 'col-1-1' },
                        betInput
                    ),
                    D.div({ className: 'col-1-1' },
                        autoCashOut
                    )
                );
            },

            render: function () {
                var self = this;
                //If the game is able to bet
                var buttonCol, controlInputs;
                if (!(this.props.engine.gameState === 'IN_PROGRESS' && this.props.engine.userState === 'PLAYING') && !(this.props.engine.nextBetAmount || // a bet is queued
                    (this.props.engine.gameState === 'STARTING' && this.props.engine.userState === 'PLAYING')
                    )) {
                    buttonCol = D.div({ className: 'col-1-2 mobile-col-1-1' },
                        this.getBetButton()
                    );

                    controlInputs = D.div({ className: 'col-1-2 mobile-col-1-1' },
                        this.getControlInputs()
                    );
                    //If the game is not able to bet
                } else {
                    buttonCol = D.div({ className: 'col-1-1 mobile-col-1-1' },
                        this.getBetButton()
                    );
                    controlInputs = null;
                }

                // If they're not logged in, let just show a login to play
                if (!this.props.engine.username)
                    return D.div({ className: 'grid grid-pad' },
                        D.div({ className: 'controls'},
                            D.div({className: 'login'}, D.a({className: 'big-button unselect', href: '/login' }, 'Login to play'),
                                D.a({href: '/register', className: 'register'}, 'or register ')
                            )
                        )
                    );

                //If the user is logged in render the controls
                return D.div(null,
                    D.div({ className: 'controls-container' },

                        D.h5({ className: 'information'},
                            this.getStatusMessage()
                        ),

                        D.div({ className: 'controls-grid grid grid-pad' },
                            controlInputs,

                            buttonCol
                        ),

                        D.div({ className: 'auto-bet-cont'  },
                            D.label(null,
                                D.input({
                                    type: 'checkbox',
                                    name: 'autoplay',
                                    onChange: this.toggleAutoPlay,
                                    checked: this.state.auto_play,
                                    disabled: this.invalidBet()
                                }),
                                'auto bet'
                            )
                        )
                    ),

                    D.div({ className: 'hash-cont'  },
                        D.span({ className: 'hash-text' }, 'Hash'),
                        D.input({ className: 'hash-input', type: 'text', value: this.props.engine.hash, readOnly: true }),
                        D.div({ className: 'hash-copy-cont', onClick: self.copyHash },
                            D.span({ className: 'hash-copy' }, D.i({ className: 'fa fa-clipboard' })))
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
