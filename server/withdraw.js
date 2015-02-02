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
                if (err.message === 'Insufficient funds')
                    return callback('PENDING');
                return callback(new Error('Could not sent to Address ' + withdrawalAddress  + ', funding id ' + fundingId + ': \n' + err));
            }

            db.setFundingsWithdrawalTxid(fundingId, hash, function (err) {
                if (err)
                    return callback(new Error('Could not set fundingId ' + fundingId + ' to ' + hash + ': \n' + err));

                callback(null);
            });
        });
    });
};

