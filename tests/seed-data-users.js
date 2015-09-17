var db = require('../server/database');
var async = require('async');
var chance = new require('chance')();

var USER_COUNT = 100000;

var count = 0;

async.whilst(
    function () { return count < USER_COUNT ; },
    function (callback) {

        var username = chance.word();

        db.query("select exists(select 1 from users where username = $1)", [username], function(err, res) {
            if(err)
                return callback(err);


            //If username does not exist
            if(!res.rows[0].exists) {
                db.query("insert into users (username, password) VALUES ($1, 'test')", [username], function(err, res) {
                    if(err)
                        return callback(err);

                    console.log(username);
                    callback();
                });
            } else {
                console.log('Already exist');
            }
        });


        count++;
        setTimeout(callback, 1000);
    },
    function (err) {
        if(err)
            return console.log(err);
    }
);