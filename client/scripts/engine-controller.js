define(['engine-proxy'], function(EngineProxy) {

    function EngineController(engine, script, stopProxy) {
        this.stopProxy = stopProxy;

        //Create Engine Proxy
        this.engineProxy = new EngineProxy(engine, stopProxy);

        //Create Script from Source
        var scriptBot = new Function('engine', script);

        //Run the script and replace the Engine Proxy methods
        scriptBot(this.engineProxy);

        //startEngine (Subscribe the Engine Proxy to all the engine events)
        startEngine(this.engineProxy);

    }

    EngineController.prototype.stop = function() {
        this.engineProxy.localStop();
    };

    function startEngine(engineProxy) {

        var events = {

            /* Game State Events */
            game_starting: engineProxy.onGameStarting.bind(engineProxy),
            game_started: engineProxy.onGameStarted.bind(engineProxy),
            game_crash: engineProxy.onGameCrash.bind(engineProxy),

            /* User Events */
            user_bet: engineProxy.onUserBet.bind(engineProxy),
            cashed_out: engineProxy.onCashedOut.bind(engineProxy),
            bet_queued: engineProxy.onBetQueued.bind(engineProxy),
            cancel_bet: engineProxy.onCancelBet.bind(engineProxy),
            bet_placed: engineProxy.onBetPlaced.bind(engineProxy),

            /* Players Events */
            player_bet: engineProxy.onPlayerBet.bind(engineProxy),
            user_cashed_out: engineProxy.onUserCashedOut.bind(engineProxy),

            /* Chat Events */
            msg: engineProxy.onChatMsg.bind(engineProxy),

            /* Connection Events */
            connected: engineProxy.onConnected.bind(engineProxy),
            disconnected: engineProxy.onDisconnected.bind(engineProxy)

        };

        Object.keys(events).forEach(function(key) {
            engineProxy.engine.on(key, events[key]);
        });

        engineProxy.events = events;
    }

    return EngineController;
});