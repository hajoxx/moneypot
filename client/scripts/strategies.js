define(function() {

    var strategies = {

        custom: "// This strategy editor is in BETA mode, please\n\
// exercise extreme caution and use exclusively at\n\
// your own risk. No bets can or will be refunded in\n\
// case of errors.\n\
\n\
// Please note the strategy editor executes arbitrary\n\
// javascript without a sandbox and as such, only use\n\
// strategies from trusted sources, as they can be\n\
// backdoored to lose all your money or have\n\
// intentional exploitable weaknesses etc.\n\
\n\
// To see the full engine API go to:\n\
///https://github.com/moneypot/webserver/blob/master/client/scripts/engine-proxy.js\n\
\n\
// To discuss, request or post a strategy checkout:\n\
///http://www.reddit.com/r/moneypot/\n\
\n\
//Engine events:\n\
\n\
engine.onGameStarting = function(info) {\n\
    console.log('Game Starting in ' + info.time_till_start);\n\
};\n\
\n\
engine.onGameStarted = function() {\n\
    console.log('Game Started');\n\
};\n\
\n\
engine.onGameCrash = function(data) {\n\
    console.log('Game crashed at ', data.game_crash);\n\
};\n\
\n\
engine.onUserBet = function(data) {\n\
    console.log('I bet ', data.bet, ' satoshis');\n\
};\n\
\n\
engine.onUserCashedOut = function(resp) {\n\
    console.log('I cashed out at ', resp.stopped_at/100, 'x');\n\
};\n\
\n\
engine.onBetQueued = function() {\n\
    console.log('My bet will be done at onGameStarting cause you can only join between gameStarting and gameStarted.');\n\
};\n\
\n\
engine.onCancelBet = function() {\n\
    console.log('My queued was cancel');\n\
};\n\
\n\
engine.onBetPlaced = function() {\n\
    console.log('My bet was placed');\n\
};\n\
\n\
engine.onPlayerBet = function(data) {\n\
    console.log('The player ', data.username, ' placed a bet. This player could be me :o.');\n\
};\n\
\n\
engine.onCashedOut = function(resp) {\n\
    console.log('The player ', resp.username, ' cashed out. This could be me.');\n\
};\n\
\n\
engine.onChatMsg = function(data) {\n\
    console.log('Chat message!...');\n\
};\n\
\n\
engine.onConnected = function() {\n\
    console.log('Client connected, this wont happen when you run the script');\n\
};\n\
\n\
engine.onDisconnected = function() {\n\
    console.log('Client disconnected');\n\
};\n\
\n\
\n\
//Getters:\n\
console.log('Balance: ' + engine.getBalance());\n\
console.log('The current payout is: ' + engine.getCurrentGamePayout());\n\
console.log('The game was lost? ', engine.lastGameWasLost()?'yes':'no');\n\
console.log('The last game was played? ', engine.lastGamePlayed()?'yes':'no');\n\
\n\
//Actions:\n\
//Do this between the 'game_starting' and 'game_started' events\n\
//engine.placeBet(betInSatoshis, autoCashOutinPercent, autoPlay);\n\
\n\
//engine.cashOut(); //Do this when playing\n",

        martingale: "//MoneyBot Settings\n\
var baseBet = 1000; //in Bits\n\
\n\
//MoneyBot\n\
var satoshis = baseBet * 100;\n\
var currentBet = satoshis;\n\
var lastGameLost = false;\n\
\n\
engine.onGameStarting = function () {\n\
    if (engine.lastGameWasLost()) {\n\
        currentBet *= 2;\n\
        console.log('Last Game was lost :(');\n\
    } else {\n\
        currentBet = satoshis;\n\
        console.log('Last game was not lost');\n\
    }\n\
    if(currentBet < engine.getBalance()) {\n\
        engine.placeBet(currentBet, 200, false);\n\
    }\n\
    else {\n\
        engine.stop();\n\
        console.log('You ran out of bits :(');\n\
    }\n\
};\n",

        random: "//Set your bet, max and min cashouts and let the destiny decides\n\
var maxBet = 400;//The max x\n\
var minBet = 1.1;\n\
\n\
function getRandomArbitrary(min, max) {\n\
    return Math.random() * (max - min) + min;\n\
}\n\
\n\
engine.onGameStarting = function() {\n\
    var bet = Math.round(getRandomArbitrary(minBet*100, maxBet*100)/100)*100;\n\
    console.log('Betting '+ bet + ' bits');\n\
    engine.placeBet(bet, 1000, false);\n\
}\n",
        blank: ''
    };

    return strategies;
});





