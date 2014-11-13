define(['engine-proxy'], function(EngineProxy) {

    function EngineController(engine, logicFn, stopProxy) {

        //Create Engine Proxy
        this.engineProxy = new EngineProxy(engine, stopProxy);

        //TODO: Print a decent error, maybe using try catch
        //Run the script code that contains the subscription methods for the engine proxy
        logicFn(this.engineProxy);

        //Subscribe the Engine Proxy to all the real engine events
        startEngine(this.engineProxy);
    }

    EngineController.prototype.stop = function() {
        this.engineProxy.localStop();
    };

    function startEngine(engineProxy) {

        var eventNames = [

            /* Game State Events */
            'game_starting', 'game_started', 'game_crash',

            /* Players Events */
            'player_bet', 'cashed_out',

            /* Chat Events */
            'msg',

            /* Connection Events */
            'connected', 'disconnected'];

        //Array of pairs, where each pair is eventName and the function
        var eventFunctions = eventNames.map(function(eventName) {
            var fn = engineProxy.trigger.bind(engineProxy, eventName);
            return [eventName, fn];
        });

        eventFunctions.forEach(function(pair) {
            var eventName = pair[0];
            var fn = pair[1];

            engineProxy.engine.on(eventName, fn);
        });

        engineProxy.events = eventFunctions;
    }

    return EngineController;
});
