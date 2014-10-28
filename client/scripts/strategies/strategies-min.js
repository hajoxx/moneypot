define(['../lib/multiline'], function(m) {

    var strategies = {

        custom: "// This strategy editor is in BETA mode, please exercise extreme caution and\r\n" +
            "// use exclusively at your own risk. No bets can or will be refunded in case of\r\n" +
            "// errors.\r\n" +
            "// Please note the strategy editor executes arbitrary javascript without a\r\n" +
            "// sandbox and as such, only use strategies from trusted sources, as\r\n" +
            "// they can be backdoored to lose all your money or have intentional\r\n" +
            "// exploitable weaknesses etc.\r\n" +
            "// To see the full engine API go to:\r\n" +
            "// https://github.com/moneypot/webserver/blob/strategy/client/scripts/engine-proxy.js\r\n" +
            "// To discuss, request or post a strategy checkout:\r\n" +
            "// http://www.reddit.com/r/moneypot/\r\n" +
            "//Engine events:\r\n" +
            "engine.onGameStarting = function(info) {\r\n" +
            "    console.log('Game Starting in ' + info.time_till_start);\r\n" +
            "};\r\n" +
            "engine.onGameStarted = function() {\r\n" +
            "    console.log('Game Started');\r\n" +
            "};\r\n" +
            "engine.onGameCrash = function(data) {\r\n" +
            "    console.log('Game crashed at ', data.game_crash);\r\n" +
            "};\r\n" +
            "engine.onUserBet = function(data) {\r\n" +
            "    console.log('I bet ', data.bet, ' satoshis');\r\n" +
            "};\r\n" +
            "engine.onCashedOut = function(resp) {\r\n" +
            "    console.log('I cashed out at ', resp.stopped_at/100, 'x');\r\n" +
            "};\r\n" +
            "engine.onBetQueued = function() {\r\n" +
            "    console.log(\"My bet will be done at 'onGameStarting' cause you can only join between gameStarting and gameStarted.\");\r\n" +
            "};\r\n" +
            "engine.onCancelBet = function() {\r\n" +
            "    console.log('My queued was cancel');\r\n" +
            "};\r\n" +
            "engine.onBetPlaced = function() {\r\n" +
            "    console.log('My bet was placed');\r\n" +
            "};\r\n" +
            "engine.onPlayerBet = function(data) {\r\n" +
            "    console.log('The player ', data.username, ' placed a bet. This player could be me :o.');\r\n" +
            "};\r\n" +
            "engine.onUserCashedOut = function(resp) {\r\n" +
            "    console.log('The player ', resp.username, ' cashed out. This could be me.');\r\n" +
            "};\r\n" +
            "engine.onChatMsg = function(data) {\r\n" +
            "    console.log('Chat message!...');\r\n" +
            "};\r\n" +
            "engine.onConnected = function() {\r\n" +
            "    console.log('Client connected, this wont happen when you run the script');\r\n" +
            "};\r\n" +
            "engine.onDisconnected = function() {\r\n" +
            "    console.log('Client disconnected');\r\n" +
            "};\r\n" +
            "//Getters:\r\n" +
            "console.log('Balance: ' + engine.getBalance());\r\n" +
            "console.log('The current payout is: ' + engine.getCurrentGamePayout());\r\n" +
            "console.log('The game was lost? ', engine.lastGameWasLost()?'yes':'no');\r\n" +
            "console.log('The last game was played? ', engine.lastGamePlayed()?'yes':'no');\r\n" +
            "//Actions:\r\n" +
            "//Do this between the 'game_starting' and 'game_started' events\r\n" +
            "//engine.placeBet(betInSatoshis, autoCashOutinPercent, autoPlay);\r\n" +
            "//engine.cashOut(); //Do this when playing\r\n",
        martingale: "//MoneyBot Settings\r\n" +
            "var baseBet = 1000; //in Bits\r\n" +
            "//MoneyBot\r\n" +
            "var satoshis = baseBet * 100;\r\n" +
            "var currentBet = satoshis;\r\n" +
            "var lastGameLost = false;\r\n" +
            "engine.onGameStarting = function () {\r\n" +
            "    if (engine.lastGameWasLost()) {\r\n" +
            "        currentBet *= 2;\r\n" +
            "        console.log('Last Game was lost :(');\r\n" +
            "    } else {\r\n" +
            "        currentBet = satoshis;\r\n" +
            "        console.log('Last game was not lost');\r\n" +
            "    }\r\n" +
            "    if(currentBet < engine.getBalance()) {\r\n" +
            "        engine.placeBet(currentBet, 200, false);\r\n" +
            "    }\r\n" +
            "    else {\r\n" +
            "        engine.stop();\r\n" +
            "        console.log('You ran out of bits :(');\r\n" +
            "    }\r\n" +
            "};\r\n",

        random: "//Set your bet, max and min cashouts and let the destiny decides\r\n" +
            "var maxBet = 400;//The max x\r\n" +
            "var minBet = 1.1;\r\n" +
            "function getRandomArbitrary(min, max) {\r\n" +
            "    return Math.random() * (max - min) + min;\r\n" +
            "}\r\n" +
            "engine.onGameStarting = function() {\r\n" +
            "    var bet = Math.round(getRandomArbitrary(minBet*100, maxBet*100)/100)*100;\r\n" +
            "    console.log('Betting '+ bet + ' bits');\r\n" +
            "    engine.placeBet(bet, 1000, false);\r\n" +
            "}\r\n",
        blank: ''
    };

    return strategies;
});





