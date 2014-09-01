define(['lib/seedrandom'], function(Seedrandom) {

    var rng;
    var currentTime;

    return {
        formatSatoshis: function(n, decimals) {
            if (typeof decimals === 'undefined') {
                if (n % 100 === 0)
                    decimals = 0;
                else
                    decimals = 2;
            }

            return (n/100).toFixed(decimals).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
        },
        
        parseBits: function(text) {
            if(typeof text !== 'string')
                return null;

            var textNum = text.replace(',', '');
            var bits = parseFloat(textNum);
            if (Number.isNaN(bits) || bits < 0)
                return null;
            return bits*100;
        },

        payout: function(betSize, ms) {
            return betSize * Math.pow(Math.E, (0.00006*ms));
        },

        payoutTime: function(betSize, payout) {
            return Math.log(payout/betSize)/0.00006;
        },

        seed: function(newSeed) {
            rng = Seedrandom(newSeed);
            currentTime = 0;
        },

        payoutNoise: function(betSize, ms, type) {
            var c1 = 0.00006;
            var c2 = 1;
            var c3 = 1;
            switch(type) {
                case 1:
                    return betSize * Math.pow(Math.E, (c1*ms)) + (Math.sin(ms * c2) * c3);
                case 2:
                    return betSize * Math.pow(Math.E, (c1*ms)) + (Math.sin(Math.random() * c2) * c3);
                case 3:
                    var rand = rng();
                    var payout = betSize * Math.pow(Math.E, (c1*ms) + (rand * c2) * c3);
                    return betSize * Math.pow(Math.E, (c1*ms)) + ((rand * c2) * c3);
            }
        },

        isNumber: function(n) {
          return !isNaN(parseFloat(n)) && isFinite(n);
        },

        winProb: function(amount, cashOut) {
           return (amount - this.houseExpectedReturn(amount, cashOut)) / cashOut;
        },

        profit: function(amount, cashOut) {
            return cashOut - amount;
        },

        houseExpectedReturn: function(amount, cashOut) {
           return 0.01 * this.profit(amount, cashOut) * (amount / cashOut);
        }

    }

});
