define([
    'react',
    'game-logic/clib',
    'lodash',
    //'components/Countdown',
    'components/BetButton',
    'actions/ControlsActions',
    'stores/ControlsStore',
    'game-logic/engine'
], function(
    React,
    Clib,
    _,
    //CountDownClass,
    BetButtonClass,
    ControlsActions,
    ControlsStore,
    Engine
){

    //var Countdown = React.createFactory(CountDownClass);
    var BetButton = React.createFactory(BetButtonClass);

    var D = React.DOM;

    function getState(){
        return {
            betSize: ControlsStore.getBetSize(),
            betInvalid: ControlsStore.getBetInvalid(),
            cashOut: ControlsStore.getCashOut(),
            cashOutInvalid: ControlsStore.getCashOutInvalid(),
            engine: Engine
        }
    }

    return React.createClass({
        displayName: 'Controls',

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired
        },

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            ControlsStore.addChangeListener(this._onChange);
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange,
                placing_bet: this._onChange,
                bet_placed: this._onChange,
                bet_queued: this._onChange,
                cashing_out: this._onChange,
                cancel_bet: this._onChange
            });
        },

        componentWillUnmount: function() {
            ControlsStore.removeChangeListener(this._onChange);
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                player_bet: this._onChange,
                cashed_out: this._onChange,
                placing_bet: this._onChange,
                bet_placed: this._onChange,
                bet_queued: this._onChange,
                cashing_out: this._onChange,
                cancel_bet: this._onChange
            });
        },

        _onChange: function() {
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
                return co.message;

            if (self.state.engine.balanceSatoshis < bet * 100)
                return 'Not enough bits';

            return null;
        },

        render: function () {
            var self = this;

            // If they're not logged in, let just show a login to play
            if (!this.state.engine.username)
                return D.div({ id: 'controls-inner-container' },
                    D.div({ className: 'login-button-container'},
                        D.a({ className: 'login-button bet-button', href: '/login' }, 'Login to play')
                    ),
                    D.div({ className: 'register-container'},
                        D.a({ className: 'register', href: '/register' }, 'or register ')
                    )
                );


            /** Control Inputs: Bet & AutoCash@  **/
            var controlInputs = [];
            controlInputs.push(D.div({ className: 'bet-container col-1-1' , key: 'ci-1' },

                D.div({ className: 'bet-input-group' + (this.state.betInvalid? ' error' : '') },
                    D.span({ className: '' }, 'Bet'),
                    D.input({
                        type: 'text',
                        name: 'bet-size',
                        value: self.state.betSize,
                        onChange: function (e) {
                            self._setBetSize(e.target.value);
                        }
                    }),
                    D.span({ className: '' }, 'bits')
                )
            ));
            controlInputs.push(D.div({ className: 'autocash-container col-1-1', key: 'ci-2' },

                D.div({ className: 'bet-input-group' + (this.state.cashOutInvalid? ' error' : '') },
                    D.span({ className: '' }, 'Auto Cash Out'),
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
                    D.span({ className: '' }, 'x')
                )

            ));

            //If the user is logged in render the controls
            return D.div({ id: 'controls-inner-container' },

                D.div({ className: 'control-inputs-container grid' },
                    controlInputs
                ),
                D.div({ className: 'button-container' },
                    BetButton({
                        engine: this.state.engine,
                        invalidBet: this._invalidBet,
                        placeBet: this._placeBet,
                        cancelBet: this._cancelBet,
                        cashOut: this._cashOut,
                        isMobileOrSmall: this.props.isMobileOrSmall
                    })
                )
            );
        }



        //_getStatusMessage: function () {
        //    var pi = this.state.engine.currentPlay();
        //
        //    if (this.state.engine.gameState === 'STARTING') {
        //        return Countdown({ engine: this.state.engine });
        //    }
        //
        //    if (this.state.engine.gameState === 'IN_PROGRESS') {
        //        //user is playing
        //        if (pi && pi.bet && !pi.stopped_at) {
        //            return D.span(null, 'Currently playing...');
        //        } else if (pi && pi.stopped_at) { // user has cashed out
        //            return D.span(null, 'Cashed Out @  ',
        //                D.b({className: 'green'}, pi.stopped_at / 100, 'x'),
        //                ' / Won: ',
        //                D.b({className: 'green'}, Clib.formatSatoshis(pi.bet * pi.stopped_at / 100)),
        //                ' ', Clib.grammarBits(pi.bet * pi.stopped_at / 100)
        //            );
        //
        //        } else { // user still in game
        //            return D.span(null, 'Game in progress..');
        //        }
        //    } else if (this.state.engine.gameState === 'ENDED') {
        //
        //        var bonus;
        //        if (pi && pi.stopped_at) { // bet and won
        //
        //            if (pi.bonus) {
        //                bonus = D.span(null, ' (+',
        //                    Clib.formatSatoshis(pi.bonus), ' ',
        //                    Clib.grammarBits(pi.bonus), ' bonus)'
        //                );
        //            }
        //
        //            return D.span(null, 'Cashed Out @ ',
        //                D.b({className: 'green'}, pi.stopped_at / 100, 'x'),
        //                ' / Won: ',
        //                D.b({className: 'green'}, Clib.formatSatoshis(pi.bet * pi.stopped_at / 100)),
        //                ' ', Clib.grammarBits(pi.bet * pi.stopped_at / 1000),
        //                bonus
        //            );
        //        } else if (pi) { // bet and lost
        //
        //            if (pi.bonus) {
        //                bonus = D.span(null, ' (+ ',
        //                    Clib.formatSatoshis(pi.bonus), ' ',
        //                    Clib.grammarBits(pi.bonus), ' bonus)'
        //                );
        //            }
        //
        //            return D.span(null,
        //                'Busted @ ', D.b({className: 'red'},
        //                    this.state.engine.tableHistory[0].game_crash / 100, 'x'),
        //                ' / You lost ', D.b({className: 'red'}, pi.bet / 100), ' ', Clib.grammarBits(pi.bet),
        //                bonus
        //            );
        //
        //        } else { // didn't bet
        //
        //          if (this.state.engine.tableHistory[0].game_crash === 0) {
        //            return D.span(null, D.b({className: 'red'}, 'INSTABUST!'));
        //          }
        //
        //          return D.span(null,
        //              'Busted @ ', D.b({className: 'red'}, this.state.engine.tableHistory[0].game_crash / 100, 'x')
        //          );
        //        }
        //
        //    }
        //}

    });

});