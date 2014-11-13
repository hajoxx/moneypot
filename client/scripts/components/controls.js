define(['lib/react',
        'lib/clib',
        'lib/lodash',
        'components/countdown',
        'components/bet_button',
        'components/cashout_button'],
    function (React, Clib, _, Countdown, BetButton, CashoutButton) {

        var D = React.DOM;

        return React.createClass({
            displayName: 'Controls',

            propTypes: {
                engine: React.PropTypes.object.isRequired
            },

            getInitialState: function () {
                return {
                    bet_size: '1', // in bits
                    cash_out: '2.00' // in multiplier
                }
            },

            /** If the bet quantity is ok and the cash out quantity is ok returns null else returns true **/
            invalidBet: function () {
                var self = this;

                if (self.props.engine.balanceSatoshis < 100)
                    return 'Not enough bits to play';

                var bet = Clib.parseBet(self.state.bet_size);
                if(bet instanceof Error)
                    return bet.message;

                var co = Clib.parseAutoCash(self.state.cash_out);
                if(co instanceof Error)
                    return bet.message;

                if (self.props.engine.balanceSatoshis < bet * 100)
                    return 'Not enough bits';

                return null;
            },

            getStatusMessage: function () {
                var pi = this.props.engine.currentPlay();

                if (this.props.engine.gameState === 'STARTING') {
                    return Countdown({ engine: this.props.engine });
                }

                if (this.props.engine.gameState === 'IN_PROGRESS') {
                    //user is playing
                    if (pi && pi.bet && !pi.stopped_at) {
                        return D.span(null, 'Currently playing...');
                    } else if (pi && pi.stopped_at) { // user has cashed out
                        return D.span(null, 'Cashed Out @  ',
                            D.b({className: 'green'}, pi.stopped_at / 100, 'x'),
                            ' / Won: ',
                            D.b({className: 'green'}, Clib.formatSatoshis(pi.bet * pi.stopped_at / 100)),
                            ' ', Clib.grammarBits(pi.bet * pi.stopped_at / 100)
                        );

                    } else { // user still in game
                        return D.span(null, 'Game in progress..');
                    }
                } else if (this.props.engine.gameState === 'ENDED') {

                    if (pi && pi.stopped_at) { // bet and won

                        var bonus;
                        if (pi.bonus) {
                            bonus = D.span(null, ' (+',
                                Clib.formatSatoshis(pi.bonus), ' ',
                                Clib.grammarBits(pi.bonus), ' bonus)'
                            );
                        }

                        return D.span(null, 'Cashed Out @ ',
                            D.b({className: 'green'}, pi.stopped_at / 100, 'x'),
                            ' / Won: ',
                            D.b({className: 'green'}, Clib.formatSatoshis(pi.bet * pi.stopped_at / 100)),
                            ' ', Clib.grammarBits(pi.bet * pi.stopped_at / 1000),
                            bonus
                        );
                    } else if (pi) { // bet and lost

                        var bonus;
                        if (pi.bonus) {
                            bonus = D.span(null, ' (+ ',
                                Clib.formatSatoshis(pi.bonus), ' ',
                                Clib.grammarBits(pi.bonus), ' bonus)'
                            );
                        }

                        return D.span(null,
                            'Game crashed @ ', D.b({className: 'red'},
                                    this.props.engine.tableHistory[0].game_crash / 100, 'x'),
                            ' / You lost ', D.b({className: 'red'}, pi.bet / 100), ' ', Clib.grammarBits(pi.bet),
                            bonus
                        );

                    } else { // didn't bet
                        return D.span(null,
                            'Game crashed @ ', D.b({className: 'red'}, this.props.engine.tableHistory[0].game_crash / 100, 'x')
                        );
                    }

                }
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

                this.props.engine.bet(bet, cashOut, function (err) {
                    if (err) {
                        console.error('Got betting error: ', err);
                    }
                });
            },

            render: function () {
                var self = this;
                var pi = this.props.engine.currentPlay();

                // If they're not logged in, let just show a login to play
                if (!this.props.engine.username)
                    return D.div({ className: 'login-container grid grid-pad' },
                        D.div({ className: 'controls'},
                            D.div({ className: 'login'}, D.a({className: 'big-button unselect', href: '/login' }, 'Login to play'),
                                D.a({ href: '/register', className: 'register'}, 'or register ')
                            )
                        )
                    );

                // Able to bet, and not betting
                var ableToBet;
                if (this.props.engine.isBetting())
                    ableToBet = false;
                else if (this.props.engine.gameState === 'IN_PROGRESS' && pi && pi.bet && !pi.stopped_at)
                    ableToBet = false;
                else
                    ableToBet = true;

                // Able to bet, or is already betting
                var ableToBetOrBetting = ableToBet || this.props.engine.isBetting();

                var button;
                if (ableToBetOrBetting) {
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
                if (ableToBet) {
                    buttonClass = 'col-1-2 mobile-col-1-1';
                    controlInputs = D.div({ className: 'col-1-2 mobile-col-1-1' },
                        this.getControlInputs()
                    );
                } else {
                    buttonClass = 'col-1-1 mobile-col-1-1';
                    controlInputs = null;
                }
                buttonCol = D.div({ className: buttonClass }, button );

                //If the user is logged in render the controls
                return D.div(null,
                    D.div({ className: 'controls-container' },

                        D.h5({ className: 'information'},
                            this.getStatusMessage()
                        ),

                        D.div({ className: 'controls-grid grid grid-pad' },
                            controlInputs,
                            buttonCol
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