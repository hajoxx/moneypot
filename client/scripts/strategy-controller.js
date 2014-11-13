define([
    'strategies/strategies',
    'engine-controller',
    'lib/events',
    'lib/lodash'], function(
    Strategies,
    EngineController,
    Events,
    _) {

    //Where the states of the strategy editor and the widgets lives
    var StrategyController = function(engine) {
        _.extend(this, Events);

        this.engine = engine;

        //Reference to the engine controller if running
        this.engineController = null;

        //Strategy: Could have a widget or just the script { widget: function, logic: function, validation: function }
        this.strategy = Strategies.autoBet; //Default Strategy

        //Is the script running
        this.active = false;

        this.selectedStrategy = 'autoBet';

        //Widgets States, set the initial state for each widget
        this.widgetStates = {};
        for(var strategy in Strategies) {
            if(Strategies[strategy].isWidget)
                this.widgetStates[strategy] = Strategies[strategy]['initialState'];
        }

    };

    /** Strategy controller API for the strategy_editor **/

    StrategyController.prototype.runStrategy = function() {
        console.assert(!this.engineController);

        var logicFn;
        //If the strategy a widget the logic is on strategy.logic
        //we send the settings to logic and it returns a function with the logic of the script
        if (this.strategy.isWidget)
            logicFn = this.strategy.logic(this.widgetStates[this.selectedStrategy]);
        //else is a string and we convert that string in to a function
        else
            logicFn = new Function('engine', this.strategy);

        //Create an engine controller each time the user clicks run
        this.engineController = new EngineController(this.engine, logicFn, this.stopScript.bind(this));
        this.active = true;
        this.trigger('change');
        this.trigger('widget_change');
    };

    StrategyController.prototype.stopScript = function() {
        this.engineController.stop();
        this.engineController = null;
        this.active = false;
        this.trigger('change');
        this.trigger('widget_change');
    };

    //Updates de script of our current strategy every time it changes
    StrategyController.prototype.updateScript = function(script) {
        console.assert(!this.strategy.isWidget);
        this.strategy = script;
        this.trigger('change');
    };

    StrategyController.prototype.selectStrategy = function(strategyName) {
        console.assert(Strategies.hasOwnProperty(strategyName));

        this.selectedStrategy = strategyName;
        this.strategy = Strategies[strategyName];
        this.trigger('change');
    };

    StrategyController.prototype.getState = function() {
        return {
            active: this.active,
            strategy: this.strategy
        }
    };

    StrategyController.prototype.dataInvalid = function() {
        //If the data on the widget if exist is invalid or if the user is not logged in
        return ((this.strategy.isWidget)?this.widgetStates[this.selectedStrategy].invalidData:false) || !this.engine.username;
    };


    /** Widget API **/

    StrategyController.prototype.setWidgetState = function(property, state) {
        console.assert(this.strategy.isWidget);
        this.widgetStates[this.selectedStrategy][property] = state;
        this.validateInput();
        this.trigger('widget_change');
        this.trigger('change');
    };

    //This could be called after changing the strategy if we use the same event
    StrategyController.prototype.getWidgetState = function() {
        console.assert(this.strategy.isWidget);
        return this.widgetStates[this.selectedStrategy];
    };

    StrategyController.prototype.getEditorState = function() {
        return this.active;
    };

    //We validate the input here because this is the controller(state) of the widget
    StrategyController.prototype.validateInput = function () {
        if(this.strategy.isWidget)
            this.widgetStates[this.selectedStrategy].invalidData = this.strategy.validate(this.widgetStates[this.selectedStrategy]);
        else
            this.widgetStates[this.selectedStrategy].invalidData = false;
    };

    return StrategyController;
});