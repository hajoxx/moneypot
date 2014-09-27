'use strict';
var assert = require('better-assert'),
    log = require('debug')('coinbase'),
    request = require('request'),
    util = require('util'),
    cryptoJS = require('crypto-js');

function CoinbaseError (error) {
    Error.captureStackTrace(this, CoinbaseError);
    this.error = error;
}

util.inherits(CoinbaseError, Error);

CoinbaseError.prototype.toString = function toString () {
    return "CoinbaseError: " + this.error;
};

var last = 0;
function getNonce() {
    var nonce = Date.now() * 1000;
    if (nonce <= last)
        nonce = last + 1;
    last = nonce;
    return nonce;
}

var baseUrl = 'https://coinbase.com/api/v1/';

function makeUrl(path) {
    var expires = Math.round(Date.now() / 1000) + 3600;
    return baseUrl + path + '?expire=' + expires;
}

function Coinbase (options) {
    if (!options || !options.APIKey || !options.APISecret)
        throw new CoinbaseError('Must provide an APIKey and APISecret in order to interact with the coinbase api');
    this.apiKey = options.APIKey;
    this.apiSecret = options.APISecret;

    var self = this;

    this.account = {};

    function get (url, callback) {
        var nonce = getNonce();
        var message = nonce + url;
        var signature = cryptoJS.HmacSHA256(message, self.apiSecret);
        var reqObject = {
            url: url,
            headers: {
                'ACCESS_KEY': self.apiKey,
                'ACCESS_SIGNATURE': signature,
                'ACCESS_NONCE': nonce
            }
        };

        request.get(reqObject, function (err, res, data) {
            if (err) {
                return callback(err);
            } else {
                try {
                    data = JSON.parse(data);
                } catch (err) {
                    return callback(err);
                }
                if (data.success === false || data.errors || data.error) {
                    return callback(new CoinbaseError(data.errors || data.error))
                }
                return callback(null, data);
            }

        });
    }

    function post (url, param, callback) {
        var nonce = getNonce();
        var body = JSON.stringify(param);
        var message = nonce + url + body;
        var signature = cryptoJS.HmacSHA256(message, self.apiSecret);
        var reqObject = {
            headers: {
                'ACCESS_KEY': self.apiKey,
                'ACCESS_SIGNATURE': signature,
                'ACCESS_NONCE': nonce,
                'content-type': 'application/json'
            },
            url: url,
            body: body
        };

        request.post(reqObject, function (err, res, data) {
            if (err) { return callback(err); }
            try {
                data = JSON.parse(data);
            } catch (err) {
                return callback(err);
            }
            if (data.success === false || data.errors || data.error) {
                return callback(new CoinbaseError(data.errors || data.error))
            }
            return callback(null, data);
        });
    }

    self.getTransactionHash = function(coinbaseId, callback) {

        var delay = 250; // How many ms to delay the next attempt by..

        var erred = false; // ignore the first error

        function run() {
            var url = makeUrl('transactions/' + coinbaseId);
            log('get ' + url);
            get(url, function(err, data) {
                if (err) {
                    if (erred)
                        return callback(err);
                    erred = true;
                    setTimeout(run, 1000);
                    return;
                }

                if (!data.transaction || !data.transaction.hsh) {
                    delay = delay * 2; // exponential increase

                    if (delay > 1000000)
                        return callback(new Error('Could not find hash even after a long time'));

                    setTimeout(run, delay);
                    return;
                }

                callback(null, data.transaction.hsh);
            });
        }

        run();
    };




    self.sendMoney = function(to, satoshis, callback) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[INTERNAL_ERROR] Will not make transfer in dev mode');
            return callback(null, '000IN_DEV_MODE000');
        }


        var url = makeUrl('transactions/send_money');

        var amount = (satoshis / 1e8).toFixed(8);

        var transaction = {
                to: to,
                amount: amount
            };

        if (satoshis < 100000) {
            transaction['user_fee'] = '0.0002'; // 200 bits
        }

        console.log('Making coinbase transaction: ', transaction);
        post(url, { transaction: transaction }, function(err, body) {
            if (err) return callback(err);

            var coinbaseId = body.transaction.id;
            assert(coinbaseId);

            callback(null, coinbaseId);
        });
    }

}

module.exports = Coinbase;