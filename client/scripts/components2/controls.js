define(['lib/react',
        'lib/clib',
        'lib/lodash',
        'components2/countdown',
        'components2/bet_button',
        'components2/cashout_button'],
    function (React, Clib, _, Countdown, BetButton, CashoutButton) {

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

            /** If the bet quantity is ok and the cash out quantity is ok returns null else returns true **/
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

                if (!/^\d+(\.\d{1,2})?$/.test(co))
                    return 'Invalid auto cash out amount';

                co = parseFloat(co);
                console.assert(!_.isNaN(co));

                if (_.isNaN(bet) || co < 1 || Math.floor(bet) !== bet)
                    return 'The bet should be an integer greater than or equal to one';

                if (self.props.engine.balanceSatoshis < bet * 100)
                    return 'Not enough bits';

                return null;
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
                            ' ', Clib.grammarBits(this.props.engine.lastGameWonAmount)
                        );

                    } else { // user still in game
                        return D.span(null, 'Game in progress..');
                    }
                } else if (this.props.engine.gameState === 'ENDED') {

                    if (this.props.engine.lastBet && this.props.engine.lastGameWonAmount) { // bet and won

                        var bonus;
                        if (this.props.engine.lastBonus) {
                            bonus = D.span(null, ' (+',
                                Clib.formatSatoshis(this.props.engine.lastBonus), ' ',
                                Clib.grammarBits(this.props.engine.lastBonus), ' bonus)'
                            );
                        }

                        return D.span(null, 'Cashed Out @ ',
                            D.b({className: 'green'}, (this.props.engine.lastGameWonAmount / this.props.engine.lastBet), 'x'),
                            ' / Won: ',
                            D.b({className: 'green'}, Clib.formatSatoshis(this.props.engine.lastGameWonAmount)),
                            ' ', Clib.grammarBits(this.props.engine.lastGameWonAmount),
                            bonus
                        );
                    } else if (this.props.engine.lastBet) { // bet and lost

                        var bonus;
                        if (this.props.engine.lastBonus) {
                            bonus = D.span(null, ' (+ ',
                                Clib.formatSatoshis(this.props.engine.lastBonus), ' ',
                                Clib.grammarBits(this.props.engine.lastBonus), ' bonus)'
                            );
                        }

                        return D.span(null,
                            'Game crashed @ ', D.b({className: 'red'}, this.props.engine.lastGameCrashedAt / 100, 'x'),
                            ' / You lost ', D.b({className: 'red'}, this.props.engine.lastBet / 100), ' ', Clib.grammarBits(this.props.engine.lastBet),
                            bonus
                        );

                    } else { // didn't bet
                        return D.span(null,
                            'Game crashed @ ', D.b({className: 'red'}, this.props.engine.lastGameCrashedAt / 100, 'x')
                        );
                    }

                }
            },

            toggleAutoPlay: function () {
                var prev = this.state.auto_play;
                if (prev) this.props.engine.cancelAutoPlay();
                this.setState({ auto_play: !prev });
            },

            copyHash: function () {
                prompt('Game ' + this.props.engine.gameId + ' hash:', this.props.engine.hash);
            },

            /** Control Inputs: Bet, Autocash, Autobet  **/
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

            render: function () {
                var self = this;

                //If the game is able to bet (If the user is not playing & does not have a queued bet)
                function ableTobet(engine) {
                    return (!(engine.gameState === 'IN_PROGRESS' && engine.userState === 'PLAYING') &&
                        !(engine.nextBetAmount || (engine.gameState === 'STARTING' && engine.userState === 'PLAYING')));
                }

                function ableToBetOrBetting(engine) {
                    //If the user is not playing
                    return (!(engine.gameState === 'IN_PROGRESS' && engine.userState === 'PLAYING') ||
                        //If the user is betting ((a bet is queued and not playing) or (the user already bet and the game has not started yet))
                        engine.nextBetAmount && !(engine.gameState === 'IN_PROGRESS' && engine.userState === 'PLAYING')
                    );
                }

                var button;
                if (ableToBetOrBetting(this.props.engine)) {
                    button = BetButton({
                        engine: this.props.engine,
                        invalidBet: this.invalidBet,
                        placeBet: this.placeBet
                    });
                    //If the game is not able to bet
                } else {
                    button = CashoutButton({
                        engine: this.props.engine,
                        invalidBet: this.invalidBet
                    });
                }

                var buttonClass;
                var buttonCol, controlInputs;
                if(ableTobet(this.props.engine)) {
                    buttonClass = 'col-1-2 mobile-col-1-1';
                    controlInputs = D.div({ className: 'col-1-2 mobile-col-1-1' },
                        this.getControlInputs()
                    );
                } else {
                    buttonClass = 'col-1-1 mobile-col-1-1';
                    controlInputs = null;
                }
                buttonCol = D.div({ className: buttonClass }, button );

                // If they're not logged in, let just show a login to play
                if (!this.props.engine.username)
                    return D.div({ className: 'login-container grid grid-pad' },
                        D.div({ className: 'controls'},
                            D.div({ className: 'login'}, D.a({className: 'big-button unselect', href: '/login' }, 'Login to play'),
                                D.a({ href: '/register', className: 'register'}, 'or register ')
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
    }
);