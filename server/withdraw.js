var assert = require('assert');
var bc = require('./bitcoin_client');
var db = require('./database');
var request = require('request');

// Doesn't validate
module.exports = function(userId, satoshis, withdrawalAddress, callback) {
    assert(typeof userId === 'number');
    assert(satoshis > 10000);
    assert(typeof withdrawalAddress === 'string');
    assert(typeof callback === 'function');


    db.makeWithdrawal(userId, satoshis, withdrawalAddress, function (err, fundingId) {
        if (err) {
            if (err.code === '23514')
                callback('NOT_ENOUGH_MONEY');
            else
                callback(err);
            return;
        }

        assert(fundingId);

        var amountToSend = (satoshis - 10000) / 1e8;
        bc.sendToAddress(withdrawalAddress, amountToSend, function (err, hash) {
            if (err) {
                console.error('[INTERNAL_ERROR] COULD NOT SEND TO ADDRESS: ', err, fundingId, withdrawalAddress);
                return callback(err);
            }

            db.setFundingsWithdrawalTxid(fundingId, hash, function (err) {
                if (err) {
                    console.error('[INTERNAL_ERROR] Could not set fundingId ', fundingId, ' to ', hash, ' because: ', err);
                    return callback(err);
                }

                callback(null);
            });
        });
    });
};

