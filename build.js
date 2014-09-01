var assert = require('assert');
var crypto = require('crypto');
var exec = require('child_process').exec;
var fs = require('fs');


var todo = [];

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

var jsHash = hash('./build/main-built.js').substring(0, 8);
var cssHash = hash('./build/css/app.css').substring(0, 8);
var gameCssHash = hash('./build/css/game.css').substring(0, 8);

console.log('Hash of js: ', jsHash);
console.log('Hash of css: ', cssHash);
console.log('Hash of game css: ', gameCssHash);


execute('cp ./build/main-built.js ./build/' + jsHash + '.js');
execute('cp ./build/css/app.css ./build/css/' + cssHash + '.css');
execute('cp ./build/css/game.css ./build/css/' + gameCssHash + '.css');


// simple replace, no escaping bullshit
function sreplace(str, find, replace) {
    var arr = str.split(find);
    assert(arr.length === 2);
    return arr[0] + replace + arr[1];
}

var contents = fs.readFileSync('./views/table.html', { encoding: 'UTF-8' });
contents = sreplace(contents, 'scripts/lib/require.js',  jsHash + '.js');
fs.writeFileSync('./views/table.html', contents);

var contents = fs.readFileSync('./server.js', { encoding: 'UTF-8' });
contents = sreplace(contents, '/client',  '/build');
fs.writeFileSync('./server.js', contents);

var contents = fs.readFileSync('./views/template/head.html', { encoding: 'UTF-8' });
contents = sreplace(contents, '/css/app.css',  '/css/' + cssHash + '.css');
contents = sreplace(contents, '/css/game.css',  '/css/' + gameCssHash + '.css');
fs.writeFileSync('./views/template/head.html', contents);




