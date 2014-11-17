var admin = require('./admin');
var assert = require('better-assert');
var lib = require('./lib');
var database = require('./database');
var user = require('./user');
var games = require('./games');
var sendEmail = require('./sendEmail');
var stats = require('./stats');


function staticPageLogged(page, loggedGoTo) {

    return function(req, res) {
        var user = req.user;
        if ( !user){
            return res.render(page);
        }
        if (loggedGoTo) return res.redirect(loggedGoTo);

        res.render(page, { user: user });
    }
}
 
function contact(origin) {
    assert(typeof origin == 'string');

    return function(req, res) {
        var user = req.user;
        var from = req.body.email;
        var message = req.body.message;

        if (!from ) return res.render(origin, { user: user, warning: 'email required'});

        if (!message) return res.render(origin, { user: user, warning: 'message required'});

        if (user) message = 'user_id: ' + req.user.id + '\n' + message;

        sendEmail.contact(from, message, null, function(err) {
            if (err) {
                console.log('[INTERNAL_ERROR] got error: ', err);
                return res.send('error');
            }
            return res.render(origin, { user: user, success: 'Thank you for writing, one of my humans will write you back very soon :) ' });
        });
    }
}

function restrict(req, res, next) {
    if (!req.user) {
       res.status(401);
       if (req.header('Accept') === 'text/plain')
          res.send('Not authorized');
       else
          res.render('401');
       return;
    }
    next();
}

function adminRestrict(req, res, next) {

    if (!req.user || !req.user.admin) {
        res.status(401);
        if (req.header('Accept') === 'text/plain')
            res.send('Not authorized');
        else
            res.render('401');
        return;
    }
    next();
}

function table() {
    return function(req, res) {
        res.render('table', { user: req.user, table: true });
    }
}

function error(req, res, next) {
    return res.render('error');
}


module.exports = function(app) {

    app.get('/', staticPageLogged('index'));
    app.get('/register', staticPageLogged('register', '/tables'));
    app.get('/login', staticPageLogged('login', '/tables'));
    app.get('/reset/:recoverId', user.resetForm);
    app.get('/faq', staticPageLogged('faq'));
    app.get('/contact', staticPageLogged('contact'));
    app.get('/request', restrict, user.request);
    app.get('/deposit', restrict, user.deposit);
    app.get('/withdraw', restrict, user.withdraw);
    app.get('/withdraw/request', restrict, user.withdrawRequest);
    app.get('/support', restrict, user.contact);
    app.get('/account', restrict, user.account);
    app.get('/security', restrict, user.security);
    app.get('/delete-email', restrict, user.deleteEmail);
    app.get('/forgot-password', staticPageLogged('forgot-password'));
    app.get('/calculator', staticPageLogged('calculator'));
    app.get('/guide', staticPageLogged('guide'));
    app.get('/bitcoin-gambling', staticPageLogged('bitcoin-gambling'));
    app.get('/online-gambling-meets-bitcoin', staticPageLogged('online-gambling-meets-bitcoin'));

    app.get('/play', table());
    app.get('/icarus', staticPageLogged('icarus'));

    var playRedirect = function(req,res) {
        return res.redirect(301, '/play');
    };

    // TODO: deprecate
    app.get('/tables', playRedirect);
    app.get('/tables/fun', playRedirect);
    app.get('/tables/casual', playRedirect);
    app.get('/tables/players', playRedirect);
    app.get('/tables/serious', playRedirect);

    app.get('/leaderboard', games.getLeaderBoard);
    app.get('/game/:id', games.show);
    app.get('/user/:name', user.profile);

    app.get('/error', error);

    app.post('/request', restrict, user.giveawayRequest);
    app.post('/sent-reset', user.handleReset);
    app.post('/sent-recover', user.sendPasswordRecover);
    app.post('/reset-password', restrict, user.resetPassword);
    app.post('/add-email', restrict, user.addEmail);
    app.post('/enable-2fa', restrict, user.enableMfa);
    app.post('/disable-2fa', restrict, user.disableMfa);
    app.post('/withdraw-request', restrict, user.handleWithdrawRequest);
    app.post('/support', restrict, contact('support'));
    app.post('/contact', contact('contact'));
    app.post('/logout', restrict, user.logout);
    app.post('/login', user.login);
    app.post('/register', user.register);

    app.post('/ott', restrict, function(req, res) {
        var user = req.user;
        assert(user);
        database.createOneTimeToken(user.id, function(err, token) {
            if (err) {
                console.error('[INTERNAL_ERROR] unable to get OTT got ' + err);
                res.status(500);
                return res.send('Server internal error');
            }
            res.send(token);
        });
    });
    app.get('/stats', stats.index);


    // Admin stuff
    app.get('/admin-giveaway', adminRestrict, admin.giveAway);
    app.post('/admin-giveaway', adminRestrict, admin.giveAwayHandle);

    app.get('*', function(req, res) {
        res.status(404);
        res.render('404');
    });
};
