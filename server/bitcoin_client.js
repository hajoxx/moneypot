var bitcoin = require('bitcoin');
var fs = require('fs');
var path = require('path');


var client = new bitcoin.Client({
    host: process.env.BITCOIND_HOST,
    port: process.env.BITCOIND_PORT || 8332,
    user: process.env.BITCOIND_USER,
    pass: process.env.BITCOIND_PASS,
    ssl: true,
    sslStrict: true,
    sslCa: new Buffer(process.env.BITCOIND_CERT)
});

module.exports = client;