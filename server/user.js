var assert = require('better-assert');
var async = require('async');
var bitcoinjs = require('bitcoinjs-lib');
var request = require('request');
var timeago = require('timeago');
var lib = require('./lib');
var database = require('./database');
var withdraw = require('./withdraw');
var sendEmail = require('./sendEmail');

var sessionOptions = {
        httpOnly: true,
        secure : process.env.NODE_ENV === 'production'
};

exports.register  = function(req, res, next) {
    var values = req.body;
    var username = values.user.name;
    var password = values.user.password;
    var email = values.user.email;

    var notValid = lib.isInvalidUsername(username);
    if (notValid) return res.render('register', { warning: 'username not valid because: ' + notValid, values: values.user });

    notValid = lib.isInvalidPassword(password);
    if (notValid) {
        values.user.password = null;
        values.user.confirm = null;
        return res.render('register', { warning: 'password not valid because: ' + notValid, values: values.user });
    }

    if (email) {
        notValid = lib.isInvalidEmail(email);
        if (notValid) return res.render('register', { warning: 'email not valid because: ' + notValid, values: values.user });
    }

    database.createUser(username, password, email, function(err, sessionId) {
        if (err) {
            if (err.code === '23505') {
                values.user.name = null;
                return res.render('register', { warning: 'User name taken...', values: values.user});
            }
            return next(new Error('unable to register user got ' + err));
        }
        res.cookie('id', sessionId, sessionOptions);
        return res.redirect('/tables?m=new');
    });
};

exports.login = function(req, res, next) {
    var username = req.body.user.name;
    var password = req.body.user.password;

    if (username === '' || password === '') {
        return res.render('login', { warning: 'no username or password' });
    }

    database.validateUser(username, password, function(err, userId) {
        if (err) {
            if (err == 'NO_USER') return res.render('login',{ warning: 'Username does not exist' });
            if (err = 'WRONG_PASSWORD') return res.render('login', { warning: 'Invalid password' });
            return next(new Error('Unable to validate user, got: ' + err));
        }
        assert(userId);

        database.createSession(userId, function(err, sessionId) {
            if (err) {
                return next(new Error('unable to create session for login: ' + err));
            }
            res.cookie('id', sessionId, sessionOptions);
            res.redirect('/');
        });
    });
};

exports.logout = function(req, res, next) {
    var sessionId = req.cookies.id;
    if (!sessionId) return res.redirect('/');

    database.deleteUserSession(sessionId, function(err) {
        if (err) {
            return next(new Error('unable to logout got error: ' + err));
        }
        res.redirect('/');
    });
};

exports.profile = function(req, res, next) {
    var user = req.user;

    var username = req.params.name;

    var page = null;
    if (req.query.p) {
        page = parseInt(req.query.p);
        if (!Number.isFinite(page) || page < 0)
            return next(new Error('Invalid page'));
    }

    if (!username)
        return next(new Error('No username in profile'));



    database.getPublicStats(username, function(err, stats) {
        if (err) {
            if (err === 'USER_DOES_NOT_EXIST')
               next();
            else {
                console.error('[INTERNAL_ERROR] cant get pub stats: ', err);
                next(err);
            }
            return;
        }

        if (username !== stats.username) // Matched on the wrong case
            return res.redirect(301, '/user/' + stats.username);

        var resultsPerPage = 50;
        var pages = Math.floor(stats.games_played / resultsPerPage);

        if (page && page >= pages) {
            console.warn('User ', username, ' does not have page ', page);
            return next();
        }

        // first page aborbs all overflow
        var firstPageResultCount = stats.games_played - ((pages-1) * resultsPerPage);


        var showing = page ? resultsPerPage : firstPageResultCount;
        var offset = page ? (firstPageResultCount + ((pages - page - 1) * resultsPerPage)) : 0 ;

        var tasks = [
            function(callback) {
                database.getUserNetProfitSkip(stats.user_id, showing + offset, callback);
            },
            function(callback) {
                database.getUserPlays(stats.user_id, showing, offset, callback);
            }
        ];


        async.parallel(tasks, function(err, results) {
            if (err) return next(err);

            var netProfitOffset = results[0];
            var plays = results[1];

            if (!lib.isInt(netProfitOffset)) {
                console.error('[INTERNAL_ERROR] Warning: ' + username + ' does not have an integer net profit offset');
                return next(new Error('Internal profit calc error'));
            }
            assert(plays);

            plays.forEach(function(play) {
                play.timeago = timeago(play.created);
            });


            var previousPage;
            if (pages > 1) {
                if (page && page >= 2)
                    previousPage = '?p=' + (page - 1);
                else if (!page)
                    previousPage = '?p=' + (pages - 1);
            }

            var nextPage;
            if (pages > 1) {
                if (page && page < (pages-1))
                    nextPage ='?p=' + (page + 1);
                else if (page && page == pages-1)
                    nextPage = stats.username;
            }


            res.render('user', {
                user: user,
                stats: stats,
                plays: plays,
                net_profit_offset: netProfitOffset,
                showing_last: !!page,
                previous_page: previousPage,
                next_page: nextPage,
                games_from: stats.games_played-(offset + showing - 1),
                games_to: stats.games_played-offset,
                pages: {
                    current: page == 0 ? 1 : page + 1 ,
                    total: Math.ceil(stats.games_played / 100)
                }
            });
        });







    });




};

exports.request = function(req, res) {
    var user = req.user;
    console.log('req user: ', user);
    assert(user);

    res.render('request', {user: user});
};

exports.giveawayRequest = function(req, res, next) {
    var user = req.user;
    assert(user);

    console.log('req user: ', user);

    var privatekey = '6LewY_YSAAAAAIzk70fzWH0zkqVE3q6ufOJStZ37';
    var remoteip;

    var ips = req.ips;
    if (ips.length === 0)
        remoteip = '127.0.0.1';
    else if (ips.length === 1)
        remoteip = ips[0];
    else  // TODO: only if ips[-1] is equal to cloudfront...
        remoteip = ips[ips.length - 2];

    var challenge = req.body.recaptcha_challenge_field;
    var recaptchaResponse = req.body.recaptcha_response_field;

    if (!remoteip || !challenge || !recaptchaResponse) return res.redirect('request');

    var uri =  'https://www.google.com/recaptcha/api/verify?privatekey=' + encodeURIComponent(privatekey) +
        '&remoteip=' + encodeURIComponent(remoteip) +
        '&challenge=' + encodeURIComponent(challenge) +
        '&response=' + encodeURIComponent(recaptchaResponse);

    request(uri , function(error, response, body) {

            if (error) return res.render('request', {user: user, warning: 'Unable to validate captcha. please try it later...'});

            if (response.statusCode == 200) {

                assert(body);
                var validCaptcha = body.split(/\s+/g)[0];
                if (validCaptcha !== 'true') {
                    return res.render('request', { user: user, warning: 'Invalid Captcha please try it again...' });
                }
                database.addGiveaway(user.id, function(err) {
                    if (err) {
                        if (err.message === 'NOT_ELIGIBLE') {
                            return res.render('request', { user: user, warning: 'You have to wait <b>' + err.time + '</b> minutes for your next give away.'})
                        }
                        return next(new Error('Unable to add giveaway -> got error: ' + err));
                    }
                    user.eligible = 240;
                    user.balance_satoshis += 200;
                    return res.redirect('/tables?m=received');
                });
            }
        }
    );
};

exports.account = function(req, res, next) {
    var user = req.user;
    assert(user);

    var tasks = [
        function(callback) {
            database.getDepositsAmount(user.id, callback);
        },
        function(callback) {
            database.getWithdrawalsAmount(user.id, callback);
        },
        function(callback) {
            database.getGiveAwaysAmount(user.id, callback);
        },
        function(callback) {
            database.getUserNetProfit(user.id, callback)
        }
    ];

    async.parallel(tasks, function(err, ret) {
        if (err) {
            return next(new Error('unable to get account info got ' + err));
        }

        var deposits = ret[0];
        var withdrawals = ret[1];
        var giveaways = ret[2];
        var net = ret[3];
        user.deposits = !deposits.sum ? 0 : deposits.sum;
        user.withdrawals = !withdrawals.sum ? 0 : withdrawals.sum;
        user.giveaways = !giveaways.sum ? 0 : giveaways.sum;
        user.net_profit = net.profit;
        user.deposit_address = lib.deriveAddress(user.id);

        res.render('account', {user: user});
    });
};

exports.resetPassword = function(req, res, next) {
    var user = req.user;
    assert(user);
    var password = req.body.old_password;
    var newPassword = req.body.password;
    var confirm = req.body.confirmation;

    if (!password) return  res.redirect('/account?err=enter your password');

    var notValid = lib.isInvalidPassword(newPassword);
    if (notValid) return res.redirect('/account?err=new password not valid:' + notValid);

    if (newPassword !== confirm) return  res.redirect('/account?err=new password and confirmation should be the same.');

    database.validateUser(user.username, password, function(err, userId) {
        if (err) {
            if (err  === 'WRONG_PASSWORD') return  res.redirect('/account?err=wrong password.');
            return next(new Error('Unable to reset password got ' + err));
        }
        assert(userId === user.id);
        database.changeUserPassword(user.id, newPassword, function(err) {
            if (err) {
                return next(new Error('Unable to change user password got ' +  err));
            }

           res.redirect('/account');
        });
    });
};

exports.deleteEmail = function(req, res, next) {
    var user = req.user;
    assert(user);
    if (user.email === null) res.redirect('/account');

    database.updateEmail(user.id, null, function(err) {
        if (err) {
            return next(new Error('Unable to delete email got ' + err));
        }
        res.redirect('account');
    });
};

exports.addEmail = function(req, res, next) {
    assert(req.user);
    var user  = req.user;
    user.deposit_address = lib.deriveAddress(user.id);
    var email = req.body.email;
    var password = req.body.password;

    var notValid = lib.isInvalidEmail(email);
    if (notValid) return res.redirect('/account?err=email invalid because: ' + notValid);

    notValid = lib.isInvalidPassword(password);
    if (notValid) return res.render('account?err=password not valid because: ' + notValid);

    database.validateUser(user.username, password, function(err, userId) {
        if (err) {
            if (err === 'WRONG_PASSWORD')
                return res.redirect('/account?err=wrong%20password');
            return next(new Error('Unable to validate user got ' + err));
        }

        database.updateEmail(userId, email, function(err) {
            if (err) {
                console.error('[INTERNAL_ERROR] unable to update user email -> got error: ', err);
                return next(new Error('Could not update email: ' + err));
            }
            res.redirect('account');
        });
    });
};

exports.sendPasswordRecover = function(req, res, next) {
    var username = req.body.username;
    if (!username) return res.redirect('forgot-password');
    var message = { success: 'We\'ve sent an email to this username if exists and it has a recovery email.' };

    database.getUserFromUsername (username, function(err, user) { 
        if (err) {
            if (err === 'NO_USER')
                return res.render('forgot-password', message);
            else 
                return next(new Error('Unable to get user from username got ' + err));
        }
        if (!user.email)
            return res.render('forgot-password',  message);

        database.addRecoverId(user.id, function(err, recoveryId) { 
            if (err) 
                return next(new Error('Unable to add recovery id got ' + err));

            assert(recoveryId);

            sendEmail.passwordReset(user.email, recoveryId, function(err) {
                if (err)
                    return next(new Error('[Unable to send password email got ' + err));
                return res.render('forgot-password',  message);
            });
        });
    });
};

exports.resetForm = function(req, res, next) {
    var recoverId = req.params.recoverId;
    if (!recoverId || !lib.isUUIDv4(recoverId))
        return next(new Error('Got invalid recovery id'));

    database.getUserByRecoverId(recoverId, function(err, user) {
        if (err) {
            if (err === 'NOT_VALID_RECOVER_ID') 
                return res.render('404');
            return next(new Error('resetForm: Unable to get user recover id got ' + err));
        }
        res.render('reset-password', { username: user.username, recoverId: recoverId });
    });
};

exports.handleReset = function(req, res, next) {
    var recoverId = req.body.recover_id;
    var password = req.body.password;

    if (!recoverId || !lib.isUUIDv4(recoverId)) return next(new Error('handleReset: Got invalid recovery id '));

    var notValid = lib.isInvalidPassword(password);
    if (notValid) return res.render('reset-password', { recoverId: recoverId, warning: 'password not valid because: ' + notValid });

    database.changePasswordFromRecoverId(recoverId, password, function(err, user) {
        if (err) {
            if (err === 'USER_NOT_FOUND') return res.render('404');
            return next(new Error('Unable to change password got ' + err));
        }
        database.createSession(user.id, function(err, sessionId) {
            if (err) {
                return next(new Error('Unable to create session for password from recover id got ' + err));
            }
            res.cookie('id', sessionId, sessionOptions);
            res.redirect('/');
        });
    });
};

exports.deposit = function(req, res, next) {
    var user = req.user;
    assert(user);

    database.getDeposits(user.id, function(err, deposits) {
        if (err) {
            return next(new Error('Unable to get deposits got ' + err));
        }
        user.deposits = deposits;
        res.render('deposit', { user:  user });
    });
};

exports.withdraw = function(req, res, next) {
    var user = req.user;
    assert(user);

    database.getWithdrawals(user.id, function(err, withdrawals) {
        if (err) {
            return next(new Error('Unable to get withdrawals got ' + err));
        }
        withdrawals.forEach(function(withdrawal) {
            withdrawal.shortDestination = withdrawal.destination.substring(0,8);
        });
        user.withdrawals = withdrawals;

        res.render('withdraw', { user: user });
    });
};

exports.handleWithdrawRequest = function(req, res, next) {
    var user = req.user;
    assert(user);
    var amount = req.body.amount;
    var destination = req.body.destination;
    var password = req.body.password;

    var r =  /^[1-9]\d*$/;
    if (!r.test(amount)) {
        return res.render('withdraw_request', { user: user, warning: 'Not a valid amount' });
    }

    amount = parseInt(amount) * 100;

    if (amount < 20000) {
        return res.render('withdraw_request', { user: user, warning: 'Must more 200 bits or more' });
    }

    if (typeof destination !== 'string') {
        return res.render('withdraw_request', { user: user, warning: 'Destination address not provided' });
    }

    try {
        bitcoinjs.Address.fromBase58Check(destination);
    } catch(ex) {
        console.log('Invalid withdrawal address: ', destination);
        return res.render('withdraw_request', { user: user, warning: 'Not a valid destination address' });
    }

    if (!password) {
        return res.render('withdraw_request', { user: user, warning: 'Must enter a password' });
    }

    database.validateUser(user.username, password, function(err) {

        if (err) {
            if (err === 'WRONG_PASSWORD')
                return res.render('withdraw_request', { user: user, warning: 'wrong password, try it again...' });
            return next(new Error('Unable to validate user got ' + err));
        }

        withdraw(req.user.id, amount, destination, function(err) {
            if (err) {
                if (err === 'NOT_ENOUGH_MONEY')
                    return res.render('withdraw_request', {user: user, warning: 'Not enough money to process withdraw.'});
                if (err === 'PENDING')
                    return res.render('withdraw_request', { user: user, success: 'PENDING' });
                else {
                    return next(new Error('Unable to add withdraw got '+ err));
                }
            }
            return res.render('withdraw_request', { user: user, success: 'OK' });
        });
    });
};

exports.withdrawRequest = function(req, res) {
    assert(req.user);
    res.render('withdraw_request', { user: req.user });
};

exports.contact = function(req, res) {
    assert(req.user);
    res.render('support', { user: req.user })
};
