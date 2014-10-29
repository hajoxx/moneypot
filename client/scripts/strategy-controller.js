define(['strategies/strategies', 'engine-controller', 'lib/events', 'lib/lodash'], function(Strategies, EngineController, Events, _) {

    var strategyController = function(engine) {
        _.extend(this, Events);

        this.engine = engine;

        //Script text
        this.script = Strategies.custom;

        //Is the script running
        this.active = false;

        //Reference to the engine controller if running
        this.engineController = null;

        //Default selected strategy name
        this.selectedStrategy = 'custom';
    };

    strategyController.prototype.runStrategy = function(script, bubbleStopStrategy) {
        console.assert(!this.engineController);
        this.engineController = new EngineController(this.engine, script, bubbleStopStrategy);
        this.active = true;
        this.trigger('change');
    };

    strategyController.prototype.stopScript = function() {
        this.engineController.stop();
        this.engineController = null;
        this.active = false;
        this.trigger('change');
    };

    strategyController.prototype.updateScript = function(script) {
        this.script = script;
        this.trigger('change');
    };

    strategyController.prototype.selectStrategy = function(strategyName) {
        console.assert(Strategies.hasOwnProperty(strategyName));
        this.selectedStrategy = strategyName;
        this.script = Strategies[strategyName];
        this.trigger('change');
    };

    strategyController.prototype.setActive = function(isActive) {
        this.active = isActive;
        this.trigger('change');
    };

    strategyController.prototype.getState = function() {
        return {
            active: this.active,
            script: this.script,
            selectedStrategy: this.selectedStrategy
        }
    };

    return strategyController;
});
