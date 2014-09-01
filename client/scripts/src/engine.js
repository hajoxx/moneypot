define(function() {

    var odds = 1/1000;

    function Engine(betSize, demo) {
        this.betSize = betSize;
        this.balance = this.betSize;
        this.speed = 100;
        this.interval;
        this.tickCallback;
        this.endCallback;
        this.demo = demo;
        this.time;
    }

    Engine.prototype.run = function() {
        this.time = 0;
        this.interval = setInterval(this.tick.bind(this), this.speed);
    };

    Engine.prototype.onTick = function(callback) {
        this.tickCallback = callback;
    };

    Engine.prototype.onEnd = function(callback) {
        this.endCallback = callback;
        this.balance = this.betSize;
    };

    Engine.prototype.tick = function() {
        this.time += 100;
        var random = Math.random();
        if(!this.demo) {
            if (random < odds) {
                return this.balance = 0;
            }
        }

        var newOdds = (Math.random() * odds * 2);
        this.balance += this.balance * newOdds;
        if (this.balance === 0 ){
            this.stop();
            this.endCallback();
        }
        else this.tickCallback(this.balance, this.time);
    };

    Engine.prototype.stop = function(callback) {
        clearInterval(this.interval);
        if (callback) callback(this.balance);
        this.balance = this.betSize;
    };

    Engine.prototype.setSpeed = function(speed) {
        this.speed = speed;
        return this;
    }

    return {
        create: function(betSize, demo) {
            return new Engine(betSize, demo);
        }

    }

});