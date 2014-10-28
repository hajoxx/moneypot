define(['../lib/multiline'], function(m) {

    var strategies = {

        custom: m(function(){
/*@preserve
// This strategy editor is in BETA mode, please exercise extreme caution and
// use exclusively at your own risk. No bets can or will be refunded in case of
// errors.

// Please note the strategy editor executes arbitrary javascript without a
// sandbox and as such, only use strategies from trusted sources, as
// they can be backdoored to lose all your money or have intentional
// exploitable weaknesses etc.

// To see the full engine API go to:
// https://github.com/moneypot/webserver/blob/strategy/client/scripts/engine-proxy.js

// To discuss, request or post a strategy checkout:
// http://www.reddit.com/r/moneypot/

//Engine events:

engine.onGameStarting = function(info) {
    console.log('Game Starting in ' + info.time_till_start);
};

engine.onGameStarted = function() {
    console.log('Game Started');
};

engine.onGameCrash = function(data) {
    console.log('Game crashed at ', data.game_crash);
};

engine.onUserBet = function(data) {
    console.log('I bet ', data.bet, ' satoshis');
};

engine.onCashedOut = function(resp) {
    console.log('I cashed out at ', resp.stopped_at/100, 'x');
};

engine.onBetQueued = function() {
    console.log("My bet will be done at 'onGameStarting' cause you can only join between gameStarting and gameStarted.");
};

engine.onCancelBet = function() {
    console.log('My queued was cancel');
};

engine.onBetPlaced = function() {
    console.log('My bet was placed');
};

engine.onPlayerBet = function(data) {
    console.log('The player ', data.username, ' placed a bet. This player could be me :o.');
};

engine.onUserCashedOut = function(resp) {
    console.log('The player ', resp.username, ' cashed out. This could be me.');
};

engine.onChatMsg = function(data) {
    console.log('Chat message!...');
};

engine.onConnected = function() {
    console.log('Client connected, this wont happen when you run the script');
};

engine.onDisconnected = function() {
    console.log('Client disconnected');
};


//Getters:
console.log('Balance: ' + engine.getBalance());
console.log('The current payout is: ' + engine.getCurrentGamePayout());
console.log('The game was lost? ', engine.lastGameWasLost()?'yes':'no');
console.log('The last game was played? ', engine.lastGamePlayed()?'yes':'no');

//Actions:
//Do this between the 'game_starting' and 'game_started' events
//engine.placeBet(betInSatoshis, autoCashOutinPercent, autoPlay);

//engine.cashOut(); //Do this when playing

*/

        }),
        martingale: m(function () {
/*@preserve
//MoneyBot Settings
var baseBet = 1000; //in Bits

//MoneyBot
var satoshis = baseBet * 100;
var currentBet = satoshis;
var lastGameLost = false;

engine.onGameStarting = function () {
    if (engine.lastGameWasLost()) {
        currentBet *= 2;
        console.log('Last Game was lost :(');
    } else {
        currentBet = satoshis;
        console.log('Last game was not lost');
    }
    if(currentBet < engine.getBalance()) {
        engine.placeBet(currentBet, 200, false);
    }
    else {
        engine.stop();
        console.log('You ran out of bits :(');
    }
};

*/
        }),

        random: m(function() {
/*@preserve
//Set your bet, max and min cashouts and let the destiny decides
var maxBet = 400;//The max x
var minBet = 1.1;

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

engine.onGameStarting = function() {
    var bet = Math.round(getRandomArbitrary(minBet*100, maxBet*100)/100)*100;
    console.log('Betting '+ bet + ' bits');
    engine.placeBet(bet, 1000, false);
}
*/
        }),
        blank: ''
    };

    return strategies;
});





