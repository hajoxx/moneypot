var assert = require('assert');
var crypto = require('crypto');
var exec = require('child_process').exec;
var fs = require('fs');

var todo = [];
var buildConfig = {};

/**************** OLD Client ****************/

var jsHash = hash('./build/main-built.js').substring(0, 8);
var cssHash = hash('./build/css/app.css').substring(0, 8);
var gameCssHash = hash('./build/css/game.css').substring(0, 8);

console.log('Hash of js: ', jsHash);
console.log('Hash of css: ', cssHash);
console.log('Hash of game css: ', gameCssHash);

execute('cp ./build/main-built.js ./build/' + jsHash + '.js');
execute('cp ./build/css/app.css ./build/css/' + cssHash + '.css');
execute('cp ./build/css/game.css ./build/css/' + gameCssHash + '.css');

buildConfig.jsHash = jsHash;
buildConfig.cssHash = cssHash;
buildConfig.gameCssHash = gameCssHash;


/**************** NEW Client ****************/

var jsHash = hash('./build2/main-built.js').substring(0, 8);
var cssHash = hash('./build2/css/app.css').substring(0, 8);
var gameCssHash = hash('./build2/css/game.css').substring(0, 8);

console.log('Hash of new js: ', jsHash);
console.log('Hash of new css: ', cssHash);
console.log('Hash of new game css: ', gameCssHash);

execute('cp ./build2/main-built.js ./build/' + jsHash + '.js');
execute('cp ./build2/css/app.css ./build/css/' + cssHash + '.css');
execute('cp ./build2/css/game.css ./build/css/' + gameCssHash + '.css');

buildConfig.jsHashNew = jsHash;
buildConfig.cssHashNew = cssHash;
buildConfig.gameCssHashNew = gameCssHash;

//Save the config into a file
fs.writeFileSync('./config/buildConfig.js', JSON.stringify(buildConfig));


// simple replace, no escaping bullshit
function sreplace(str, find, replace) {
    var arr = str.split(find);
    assert(arr.length === 2);
    return arr[0] + replace + arr[1];
}

function execute(command) {
    todo.push(command);

    if (todo.length === 1)
        run();

    function run() {

        var command = todo[0];
        exec(command, function(err, stdout, stderr) {
            console.log('exec result (' + command + ') ', err, stdout, stderr);
            assert(!err);
            if (stderr) console.error(stderr);

            todo.shift();
            if (todo.length > 0)
                run();
        });
    }

}

function hash(filename) {
    var shasum = crypto.createHash('sha1');
    shasum.update(fs.readFileSync(filename));
    return shasum.digest('hex');
}