define([
    'lib/react',
    'lib/lodash',
    'lib/clib',
    'stores/EngineVirtualStore'
], function(
    React,
    _,
    Clib,
    EngineVirtualStore
){
    var D = React.DOM;

    function getState(){
        return {
            engine: EngineVirtualStore.getState()
        }
    }

    return React.createClass({
        displayName: 'BetBar',

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            EngineVirtualStore.addChangeListener(this._onChange);
        },

        componentWillUnmount: function() {
            EngineVirtualStore.removeChangeListener(this._onChange);
        },

        _onChange: function() {
            //Check if its mounted because when Game view receives the disconnect event from EngineVirtualStore unmounts all views
            //and the views unregister their events before the event dispatcher dispatch them with the disconnect event
            if(this.isMounted())
                this.setState(getState());
        },

        render: function() {
            var self = this;

            if(this.state.engine.gameState === 'STARTING')
             return D.div({ className: 'bet-bar-starting' });

            var betPercentages = calculatePlayingPercentages(this.state.engine);

            var playingLostClass, cashedWonClass, mePlayingClass;
            if(this.state.engine.gameState === 'ENDED') {
                playingLostClass = 'bet-bar-lost';
                cashedWonClass = 'bet-bar-won';
                mePlayingClass = this.state.engine.currentlyPlaying?  'bet-bar-me-lost': 'bet-bar-me-won';
            } else {
                playingLostClass = 'bet-bar-playing';
                cashedWonClass = 'bet-bar-cashed';
                mePlayingClass = this.state.engine.currentlyPlaying?  'bet-bar-me-playing': 'bet-bar-me-cashed';
            }

            return D.div({ className: 'bet-bar-container' },
                D.div({ className: cashedWonClass, style: { width: betPercentages.cashedWon + '%' } }),
                D.div({ className: mePlayingClass, style: { width: betPercentages.me + '%' } }),
                D.div({ className: cashedWonClass, style: { width: betPercentages.cashedWonAfter + '%' } }),
                D.div({ className: playingLostClass, style: { width: betPercentages.playingLost + '%' } })
            );
        }

    });

    function calculatePlayingPercentages(engine) {
        /**
         * bitsPlaying: The total amount of bits playing(not cashed) minus your qty if you are playing
         * bitsCashedOut: The total amount of bits cashed before you if you are playing, if you are not its the total cashed out amount minus your qty
         * bitsCashedOutAfterMe: If you are playing...
         * myBet: guess!
         */

        //If there are no players
        if(Object.getOwnPropertyNames(engine.playerInfo).length <= 0) {
            return {
                playingLost: 0,
                cashedWon: 0,
                cashedWonAfter: 0,
                me: 0
            }
        }

        var bitsPlaying = 0, bitsCashedOut = 0, bitsCashedOutAfterMe = 0;

        var myBet = engine.currentPlay? engine.currentPlay.bet: 0;
        var myStop = (engine.currentPlay && engine.currentPlay.stopped_at)? engine.currentPlay.stopped_at: 0;

        _.forEach(engine.playerInfo,function(player, username) {
            if(username !== engine.username)
                if(player.stopped_at) {
                    if(player.stopped_at > myStop)
                        bitsCashedOutAfterMe += player.bet;
                    else
                        bitsCashedOut += player.bet;

                } else {
                    bitsPlaying+= player.bet;
                }
        });

        var totalAmountPlaying = bitsPlaying + bitsCashedOut + bitsCashedOutAfterMe + myBet;
        var obj = {
            playingLost: bitsPlaying / totalAmountPlaying * 100,
            cashedWon: bitsCashedOut / totalAmountPlaying * 100,
            cashedWonAfter: bitsCashedOutAfterMe / totalAmountPlaying * 100,
            me: myBet / totalAmountPlaying * 100
        };
        return obj;
    }
});