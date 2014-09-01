var assert = require('assert');

var Coinbase = require('./coinbase');
var coinbase = new Coinbase({
    APIKey: process.env.COINBASE_API_KEY,
    APISecret: process.env.COINBASE_SECRET
});

var db = require('./database');
var request = require('request');

// Doesn't validate
module.exports = function(userId, satoshis, withdrawalAddress, callback) {
    assert(typeof userId === 'number');
    assert(satoshis > 10000);
    assert(typeof withdrawalAddress === 'string');
    assert(typeof callback === 'function');


    db.makeWithdrawal(userId, satoshis, withdrawalAddress, function(err, fundingId) {
        if (err) {
            if (err.code === '23514')
                callback('NOT_ENOUGH_MONEY');
            else
                callback(err);
            return;
        }

        assert(fundingId);

        coinbase.sendMoney(withdrawalAddress, satoshis - 10000, function(err, coinbaseId) {
           if (err) {
               console.error('[INTERNAL_ERROR] Could not make transfer for funding: ', fundingId, err);
               return callback('PENDING');
           }

            assert(coinbaseId);

            coinbase.getTransactionHash(coinbaseId, function(err, hash) {
                if (err) {
                    return console.error('[INTERNAL_ERROR] COULD NOT GET COINBASE TXHASH FOR: ', coinbaseId, err);
                }

                db.setFundingsWithdrawalTxid(fundingId, hash, function(err) {
                    if (err)
                        return console.error('[INTERNAL_ERROR] Could not set fundingId ', fundingId, ' to ', hash, ' because: ', err);
                });
            });

            db.setFundingsCoinbaseWithdrawalTxid(fundingId, coinbaseId, function(err) {
                if (err) {
                    console.error('[INTERNAL_ERROR] Could not set funding id ', fundingId, ' to txid: ', coinbaseId, ' got error: ', err);
                    return callback('PENDING');
                }

                callback(null);
            });
        });
    });
};

