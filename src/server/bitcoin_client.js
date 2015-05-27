var bitcoin = require('bitcoin');
var fs = require('fs');
var path = require('path');
var config = require('../../config/config');

var client = new bitcoin.Client({
    host: config.BITCOIND.BITCOIND_HOST,
    port: config.BITCOIND.BITCOIND_PORT,
    user: config.BITCOIND.BITCOIND_USER,
    pass: config.BITCOIND.BITCOIND_PASS,
    ssl: true,
    sslStrict: true,
    sslCa: new Buffer(config.BITCOIND.CERT)
});

module.exports = client;