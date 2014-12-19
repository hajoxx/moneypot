define([
    'lib/react',
    'lib/clib',
    'lib/lodash',
    'components/Countdown',
    'components/BetButton',
    'components/CashOutButton',
    'actions/ControlsActions',
    'stores/ControlsStore',
    'stores/EngineVirtualStore'
], function(
    React,
    Clib,
    _,
    CountDownClass,
    BetButtonClass,
    CashOutButtonClass,
    ControlsActions,
    ControlsStore,
    EngineVirtualStore
){

    var Countdown = React.createFactory(CountDownClass);
    var BetButton = React.createFactory(BetButtonClass);
    var CashOutButton = React.createFactory(CashOutButtonClass);

    var D = React.DOM;

    function getState(){
        return {
            betSize: ControlsStore.getBetSize(),
            cashOut: ControlsStore.getCashOut(),
            engine: EngineVirtualStore.getState()
        }
    }



    var onchange;

    return React.createClass({
        displayName: 'Controls',

        getInitialState: function () {
            return getState();
        },


        componentDidMount: function() {
            onchange = this._onChange;
            ControlsStore.addChangeListener(this._onChange);
            EngineVirtualStore.addChangeListener(this._onChange);
        },

        componentWillUnmount: function() {
            ControlsStore.removeChangeListener(this._onChange);
            EngineVirtualStore.removeChangeListener(this._onChange);
            this.unmounted = true;
        },

        _onChange: function() {
            //Check if its mounted because when Game view receives the disconnect event from EngineVirtualStore unmounts all views
            //and the views unregister their events before the event dispatcher dispatch them with the disconnect event
            if(this.isMounted())
                this.setState(getState());
        },

        _placeBet: function () {

            var bet = parseInt(this.state.betSize.replace(/k/g, '000')) * 100;
            console.assert(_.isFinite(bet));

            var cashOut = parseFloat(this.state.cashOut);
            console.assert(_.isFinite(cashOut));
            cashOut = Math.round(cashOut * 100);
            console.assert(_.isFinite(cashOut));

            ControlsActions.placeBet(bet, cashOut);
        },

        _cancelBet: function() {
            ControlsActions.cancelBet();
        },

        _cashOut: function() {
            ControlsActions.cashOut();
        },

        _setBetSize: function(betSize) {
            ControlsActions.setBetSize(betSize);
        },

        _setAutoCashOut: function(autoCashOut) {
            ControlsActions.setAutoCashOut(autoCashOut);
        },

        /** If the bet quantity is ok and the cash out quantity is ok returns null else returns true **/
        _invalidBet: function () {
            var self = this;

            if (self.state.engine.balanceSatoshis < 100)
                return 'Not enough bits to play';

            var bet = Clib.parseBet(self.state.betSize);
            if(bet instanceof Error)
                return bet.message;

            var co = Clib.parseAutoCash(self.state.cashOut);
            if(co instanceof Error)
                return bet.message;

            if (self.state.engine.balanceSatoshis < bet * 100)
                return 'Not enough bits';

            return null;
        },

        _getStatusMessage: function () {
            var pi = this.state.engine.currentPlay;

            if (this.state.engine.gameState === 'STARTING') {
                return Countdown({ engine: this.state.engine });
            }

            if (this.state.engine.gameState === 'IN_PROGRESS') {
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
            } else if (this.state.engine.gameState === 'ENDED') {

                var bonus;
                if (pi && pi.stopped_at) { // bet and won

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

                    if (pi.bonus) {
                        bonus = D.span(null, ' (+ ',
                            Clib.formatSatoshis(pi.bonus), ' ',
                            Clib.grammarBits(pi.bonus), ' bonus)'
                        );
                    }

                    return D.span(null,
                        'Game crashed @ ', D.b({className: 'red'},
                            this.state.engine.tableHistory[0].game_crash / 100, 'x'),
                        ' / You lost ', D.b({className: 'red'}, pi.bet / 100), ' ', Clib.grammarBits(pi.bet),
                        bonus
                    );

                } else { // didn't bet
                    return D.span(null,
                        'Game crashed @ ', D.b({className: 'red'}, this.state.engine.tableHistory[0].game_crash / 100, 'x')
                    );
                }

            }
        },

        _copyHash: function () {
            prompt('Game ' + this.state.engine.gameId + ' hash:', this.state.engine.hash);
        },

        /** Control Inputs: Bet, AutoCash, AutoBet  **/
        _getControlInputs: function () {
            var self = this;

            var betInput = D.div(null,
                D.span({ className: 'bet-span strong' }, 'Bet'),
                D.input({
                    type: 'text',
                    name: 'bet-size',
                    value: self.state.betSize,
                    onChange: function (e) {
                        //self.setState({ betSize: e.target.value })
                        self._setBetSize(e.target.value);
                    }
                }),
                D.span({ className: 'sticky' }, 'Bits')
            );

            var autoCashOut = D.div(null,
                D.div({ className: 'auto-cash-out-span' }, 'Auto Cash Out @ '),
                D.input({
                    min: 1,
                    step: 0.01,
                    value: self.state.cashOut,
                    type: 'number',
                    name: 'cash-out',
                    onChange: function (e) {
                        self._setAutoCashOut(e.target.value);
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
            var pi = this.state.engine.currentPlay;

            // If they're not logged in, let just show a login to play
            if (!this.state.engine.username)
                return D.div({ className: 'login-container grid grid-pad' },
                    D.div({ className: 'controls'},
                        D.div({ className: 'login'}, D.a({className: 'big-button unselect', href: '/login' }, 'Login to play'),
                            D.a({ href: '/register', className: 'register'}, 'or register ')
                        )
                    )
                );

            // Able to bet, and not betting
            var ableToBet;
            if (this.state.engine.isBetting)
                ableToBet = false;
            else if (this.state.engine.gameState === 'IN_PROGRESS' && pi && pi.bet && !pi.stopped_at) //TODO: Document this if and maybe reduce
                ableToBet = false;
            else
                ableToBet = true;

            // Able to bet, or is already betting
            var ableToBetOrBetting = ableToBet || this.state.engine.isBetting;

            var button;
            if (ableToBetOrBetting) {
                button = BetButton({
                    engine: this.state.engine,
                    invalidBet: this._invalidBet,
                    placeBet: this._placeBet,
                    cancelBet: this._cancelBet
                });
                //If the game is not able to bet
            } else {
                button = CashOutButton({
                    engine: this.state.engine,
                    invalidBet: this._invalidBet,
                    cashOut: this._cashOut
                });
            }

            var buttonClass;
            var buttonCol, controlInputs;
            if (ableToBet) {
                buttonClass = 'col-1-2 mobile-col-1-1';
                controlInputs = D.div({ className: 'col-1-2 mobile-col-1-1' },
                    this._getControlInputs()
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
                        this._getStatusMessage()
                    ),

                    D.div({ className: 'controls-grid grid grid-pad' },
                        controlInputs,
                        buttonCol
                    )
                ),

                D.div({ className: 'hash-cont'  },
                    D.span({ className: 'hash-text' }, 'Hash'),
                    D.input({ className: 'hash-input', type: 'text', value: this.state.engine.hash, readOnly: true }),
                    D.div({ className: 'hash-copy-cont', onClick: self._copyHash },
                        D.span({ className: 'hash-copy' }, D.i({ className: 'fa fa-clipboard' })))
                )
            );
        }
    });

});