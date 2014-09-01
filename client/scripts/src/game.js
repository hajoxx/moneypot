define(function(){

    /* Game constructor */
    var Game = function() {
        this.growthFactor = 0.001;
        this.balance = 0; 
        this.betSize = 0; 
        this.screen = 'play';
        this.profit = 0.0;
        this.gameBalance;  //??
        this.timeCounter = 0;
        this.reRenderFn;
        this.id = Math.random();
    }

    Game.prototype.setInitialState =  function(balance, betSize) {
        this.balance = balance;
        this.betSize = betSize;
    };

    Game.prototype.init = function(reRenderFn) {
        this.gameBalance = [this.betSize];
        this.balance -= this.betSize;
        var self = this;
        this.interval = setInterval(function(){ self.tick() }, 100);
        this.reRenderFn = reRenderFn;
    };

    Game.prototype.getCurveValue = function(bet, ms) {
        var payback = 0.99;
        return (bet * payback * Math.pow(Math.E, this.growthFactor*ms));
    };

    Game.prototype.tick = function() {
        this.timeCounter += 100;
        var lastValue = this.getCurveValue(this.betSize, this.timeCounter);
        this.gameBalance.push(lastValue);
        this.reRenderFn();
    };

    return Game;

});
