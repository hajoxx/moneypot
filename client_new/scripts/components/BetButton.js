define([
    'lib/react',
    'lib/clib',
    'constants/AppConstants',
    //'components/Payout',
    'game-logic/engine'
], function(
    React,
    Clib,
    AppConstants,
    //PayoutClass,
    Engine
){

    var D = React.DOM;
    //var Payout = React.createFactory(PayoutClass);

    return React.createClass({
        displayName: 'BetButton',

        propTypes: {
            engine: React.PropTypes.object.isRequired,
            invalidBet: React.PropTypes.func.isRequired,
            placeBet: React.PropTypes.func.isRequired,
            cancelBet: React.PropTypes.func.isRequired,
            cashOut: React.PropTypes.func.isRequired,
            isMobileOrSmall: React.PropTypes.bool.isRequired
        },

        getInitialState: function() {
            return {
                initialDisable: true
            }
        },

        componentDidMount: function() {
            this._initialDisableTimeout();
            Engine.on({
                game_crash: this._onGameCrash
            });
        },

        componentWillUnmount: function() {
            Engine.off({
                game_crash: this._onGameCrash
            });
        },

        _onGameCrash: function() {
            this.setState({ initialDisable: true });
            this._initialDisableTimeout();
        },

        _initialDisableTimeout: function() {
            var self = this;
            setTimeout(function() {
                if(self.isMounted())
                    self.setState({ initialDisable: false });
            }, AppConstants.BetButton.INITIAL_DISABLE_TIME);
        },

        //Returns the button to cancel the bet or the message of sending bet
        //_getSendingBet: function () {
        //    var cancel;
        //    if (this.props.engine.gameState !== 'STARTING')
        //        cancel = D.a({ onClick: this.props.cancelBet }, 'cancel');
        //
        //    return D.span(null, 'Sending bet...', cancel);
        //},

        _cashOut: function () {
            this.props.cashOut();
            this.setState({ initialDisable: true });
            this._initialDisableTimeout();
        },

        render: function() {
            var self = this;

            //The user is currently playing
            var currentPlay = this.props.engine.currentPlay();

            //There is a bet in progress
            var betting = this.props.engine.isBetting();

            /**
             * The button is able to bet:
             *  the game is in progress and there isn't a bet in progress
             */
            var ableToBet;
            if (this.props.betting)
                ableToBet = false;
            else
                ableToBet = !(this.props.engine.gameState === 'IN_PROGRESS' && currentPlay && currentPlay.bet && !currentPlay.stopped_at); //TODO: Document this if and maybe reduce


            // Able to bet, or is already betting
            var ableToBetOrBetting = ableToBet || this.props.betting;

            var invalidBet = this.props.invalidBet();


            var btnClasses, btnContent = [], onClickFun = null, onMouseDownFun = null, onMouseUpFun = null;
            btnClasses = 'bet-button';

            if(ableToBetOrBetting) {

                //Betting
                if(betting) {
                    btnClasses += ' disable';

                    //Can cancel
                    if (this.props.engine.gameState !== 'STARTING') {
                        btnContent.push(D.span({ key: 'bc-0'}, this.props.isMobileOrSmall? '' : 'Betting...'), D.a({ className: 'cancel', key: 'bc-1' }, ' (Cancel)'));
                        onClickFun = this.props.cancelBet;
                        btnClasses += ' cancel';
                    } else {
                        btnContent.push(D.span({ key: 'bc-0'}, 'Betting...'));
                    }

                    //Initial disable
                } else if(this.state.initialDisable) {
                    btnContent.push(D.span({ key: 'bc-2' }, this.props.isMobileOrSmall? 'Bet' : 'Place bet'));
                    btnClasses += ' disable unselect';

                    //Able to bet
                } else if(ableToBet) {

                    //Invalid bet
                    if(invalidBet) {
                        //btnContent.push(D.span({ key: 'bc-3' }, invalidBet));
                        btnContent.push(D.span({ key: 'bc-3' }, this.props.isMobileOrSmall? 'Bet' : 'Place bet'));
                        btnClasses += ' invalid-bet unselect';

                    //Placing bet
                    } else if(this.props.engine.placingBet) {
                        btnContent.push(D.span({ key: 'bc-4' }, this.props.isMobileOrSmall? 'Bet' : 'Place bet'));
                        btnClasses += ' disable unselect';

                    //Able to bet
                    } else {
                        btnContent.push(D.span({ key: 'bc-5' }, this.props.isMobileOrSmall? 'Bet' : 'Place bet'));
                        btnClasses += ' ';
                        onClickFun = self.props.placeBet;
                    }

                    //User is cashing out
                } else {
                    console.error('Not defined state in controls');
                }

            //The user is playing
            } else {

                btnContent.push('Cash out!');
                //btnContent.push(Payout({ engine: this.props.engine }));
                //btnContent.push(' bits');

                //Cashing out
                if (this.props.engine.cashingOut) {
                    btnClasses += ' disable';

                //Able to cash out
                } else {
                    btnClasses += ' cashout';
                    onMouseDownFun = this._cashOut;
                }
            }

            return D.div({ className: 'bet-button-container', onClick: onClickFun, onMouseDown: onMouseDownFun, onMouseUp: onMouseUpFun },
                D.button({ className: btnClasses },
                    btnContent
                )
            );
        }
    });

});