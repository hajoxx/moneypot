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
             return D.div({ className: 'bet-bar-container' });

            var betPercentages = calculatePlayingPercentages(this.state.engine);
            var percentagePlayingLost = betPercentages[0];
            var percentageCashedWon = betPercentages[1];
            var myPercentage = betPercentages[2];

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
                D.div({ className: playingLostClass, style: { width: percentagePlayingLost + '%' } }),
                D.div({ className: mePlayingClass, style: { width: myPercentage + '%' } }),
                D.div({ className: cashedWonClass, style: { width: percentageCashedWon + '%' } })
            );
        }

    });

    function calculatePlayingPercentages(engine) {
        /**
         * bitsPlaying: The total amount of bits playing minus your qty if you are playing
         * bitsCashedOut: The total amount of bits cashed minus your qty if you are playing
         * myBet: guess!
         */
        var bitsPlaying = 0, bitsCashedOut = 0, myBet = 0;
        _.each(engine.playerInfo, function(player, username) {
            if(engine.username !== username)
                if(player.stopped_at)
                    bitsCashedOut += player.bet;
                else
                    bitsPlaying += player.bet;
        });

        //If you are playing here is your qty
        if(engine.currentPlay)
            myBet = engine.currentPlay.bet;

        var totalAmountPlaying = bitsPlaying + bitsCashedOut + myBet;
        return [bitsPlaying / totalAmountPlaying * 100, bitsCashedOut / totalAmountPlaying * 100, myBet / totalAmountPlaying * 100];
    }
});