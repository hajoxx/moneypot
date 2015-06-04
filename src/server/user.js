var assert = require('better-assert');
var async = require('async');
var bitcoinjs = require('bitcoinjs-lib');
var request = require('request');
var timeago = require('timeago');
var lib = require('./lib');
var database = require('./database');
var withdraw = require('./withdraw');
var sendEmail = require('./sendEmail');
var speakeasy = require('speakeasy');
var qr = require('qr-image');
var uuid = require('uuid');
var _ = require('lodash');
var config = require('../../config/config');

var sessionOptions = {
    httpOnly: true,
    secure : config.PRODUCTION
};

/**
 * POST
 * Public API
 * Register a user
 */
exports.register  = function(req, res, next) {
    var values = _.merge(req.body, { user: {} });
    var recaptcha = lib.removeNullsAndTrim(req.body['g-recaptcha-response']);
    var username = lib.removeNullsAndTrim(values.user.name);
    var password = lib.removeNullsAndTrim(values.user.password);
    var password2 = lib.removeNullsAndTrim(values.user.confirm);
    var email = lib.removeNullsAndTrim(values.user.email);

    var notValid = lib.isInvalidUsername(username);
    if (notValid) return res.render('register', { warning: 'username not valid because: ' + notValid, values: values.user });

    // stop new registrations of >16 char usernames
    if (username.length > 16)
        return res.render('register', { warning: 'Username is too long', values: values.user });

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

    // Ensure password and confirmation match
    if (password !== password2) {
        return res.render('register', {
          warning: 'password and confirmation did not match'
        });
    }

    database.createUser(username, password, email, function(err, sessionId) {
        if (err) {
            if (err === 'USERNAME_TAKEN') {
                values.user.name = null;
                return res.render('register', { warning: 'User name taken...', values: values.user});
            }
            return next(new Error('Unable to register user: \n' + err));
        }
        res.cookie('id', sessionId, sessionOptions);
        return res.redirect('/play?m=new');
    });
};

/**
 * GET
 * Public API
 * Login a user
 */
exports.login = function(req, res, next) {
    var recaptcha = lib.removeNullsAndTrim(req.body['g-recaptcha-response']);
    var username = lib.removeNullsAndTrim(req.body.username);
    var password = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);

    if (!recaptcha) {
        console.warn('No recaptca found');
        return res.render('login', { warning: 'Invalid or missing recaptcha' });
    }
    console.log('Login with recaptcha: ', recaptcha);

    if (!username || !password)
        return res.render('login', { warning: 'no username or password' });


    database.validateUser(username, password, otp, function(err, userId) {
        console.log('Attempted login for user: ', username, ' result: ', err);
        if (err) {
            if (err === 'NO_USER')
                return res.render('login',{ warning: 'Username does not exist' });
            if (err === 'WRONG_PASSWORD')
                return res.render('login', { warning: 'Invalid password' });
            if (err === 'INVALID_OTP') {
                var warning = otp ? 'Invalid one-time password' : undefined;
                return res.render('login-mfa', { username: username, password: password, warning: warning });
            }
            return next(new Error('Unable to validate user ' + username + ': \n' + err));
        }
        assert(userId);

        database.createSession(userId, function(err, sessionId) {
            if (err)
                return next(new Error('Unable to create session for userid ' + userId +  ':\n' + err));

            res.cookie('id', sessionId, sessionOptions);
            res.redirect('/');
        });
    });
};

/**
 * POST
 * Logged API
 * Logout the current user
 */
exports.logout = function(req, res, next) {
    var sessionId = req.cookies.id;
    if (!sessionId) return res.redirect('/');

    database.deleteUserSessionsBySessionId(sessionId, function(err) {
        if (err)
            return next(new Error('Unable to logout got error: \n' + err));
        res.redirect('/');
    });
};

/**
 * GET
 * Logged API
 * Shows the graph of the user profit and games
 */
exports.profile = function(req, res, next) {

    var user = req.user; //If logged here is the user info
    var username = lib.removeNullsAndTrim(req.params.name);

    var page = null;
    if (req.query.p) { //The page requested or last
        page = parseInt(req.query.p);
        if (!Number.isFinite(page) || page < 0)
            return next('Invalid page');
    }

    if (!username)
        return next('No username in profile');

    database.getPublicStats(username, function(err, stats) {
        if (err) {
            if (err === 'USER_DOES_NOT_EXIST')
               return next('User does not exist');
            else
                return next(new Error('Cant get public stats: \n' + err));
        }

        /**
         * Pagination
         * If the page number is undefined it shows the last page
         * If the page number is given it shows that page
         * It starts counting from zero
         */

        var resultsPerPage = 50;
        var pages = Math.floor(stats.games_played / resultsPerPage);

        if (page && page >= pages)
            return next('User does not have page ', page);

        // first page absorbs all overflow
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


        async.series(tasks, function(err, results) {
            if (err) return next(new Error('Error getting user profit: \n' + err));

            var netProfitOffset = results[0];
            var plays = results[1];


            if (!lib.isInt(netProfitOffset))
                return next(new Error('Internal profit calc error: ' + username + ' does not have an integer net profit offset'));

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

/**
 * GET
 * Shows the request bits page
 * Restricted API to logged users
 **/
exports.request = function(req, res) {
    var user = req.user; //Login var
    assert(user);

    res.render('request', { user: user });
};

/**
 * POST
 * Process the give away requests
 * Restricted API to logged users
 **/
exports.giveawayRequest = function(req, res, next) {
    var user = req.user;
    assert(user);

    var privatekey = config.RECAPTCHA_PRIV_KEY;
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

            if (error) return res.render('request', { user: user, warning: 'Unable to validate captcha. please try it later...', recaptchaKey: config.RECAPTCHA_SITE_KEY });

            if (response.statusCode == 200) {
                assert(body);
                var validCaptcha = body.split(/\s+/g)[0];
                if (validCaptcha !== 'true')
                    return res.render('request', { user: user, warning: 'Invalid Captcha please try it again...', recaptchaKey: config.RECAPTCHA_SITE_KEY });

                database.addGiveaway(user.id, function(err) {
                    if (err) {
                        if (err.message === 'NOT_ELIGIBLE') {
                            return res.render('request', { user: user, warning: 'You have to wait <b>' + err.time + '</b> minutes for your next give away.', recaptchaKey: config.RECAPTCHA_SITE_KEY });
                        } else if(err === 'USER_DOES_NOT_EXIST') {
                            return res.render('error', { error: 'User does not exist.' });
                        }

                        return next(new Error('Unable to add giveaway: \n' + err));
                    }
                    user.eligible = 240;
                    user.balance_satoshis += 200;
                    return res.redirect('/play?m=received');
                });
            }
        }
    );
};

/**
 * GET
 * Restricted API
 * Shows the account page, the default account page.
 **/
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
        if (err)
            return next(new Error('Unable to get account info: \n' + err));

        var deposits = ret[0];
        var withdrawals = ret[1];
        var giveaways = ret[2];
        var net = ret[3];
        user.deposits = !deposits.sum ? 0 : deposits.sum;
        user.withdrawals = !withdrawals.sum ? 0 : withdrawals.sum;
        user.giveaways = !giveaways.sum ? 0 : giveaways.sum;
        user.net_profit = net.profit;
        user.deposit_address = lib.deriveAddress(user.id);

        res.render('account', { user: user });
    });
};

/**
 * POST
 * Restricted API
 * Shows the account page, the default account page.
 **/
exports.resetPassword = function(req, res, next) {
    var user = req.user;
    assert(user);
    var password = lib.removeNullsAndTrim(req.body.old_password);
    var newPassword = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);
    var confirm = lib.removeNullsAndTrim(req.body.confirmation);

    if (!password) return  res.redirect('/security?err=enter%20your%20password');

    var notValid = lib.isInvalidPassword(newPassword);
    if (notValid) return res.redirect('/security?err=new%20password%20not%20valid:' + notValid);

    if (newPassword !== confirm) return  res.redirect('/security?err=new%20password%20and%20confirmation%20should%20be%20the%20same.');

    database.validateUser(user.username, password, otp, function(err, userId) {
        if (err) {
            if (err  === 'WRONG_PASSWORD') return  res.redirect('/security?err=wrong password.');
            if (err === 'INVALID_OTP') return res.redirect('/security?err=invalid one-time password.');
            //Should be an user here
            return next(new Error('Unable to reset password: \n' + err));
        }
        assert(userId === user.id);
        database.changeUserPassword(user.id, newPassword, function(err) {
            if (err)
                return next(new Error('Unable to change user password: \n' +  err));

            database.deleteUserSessionsByUserId(user.id, function(err) {
                if (err)
                    return next(new Error('Unable to delete user sessions for userId: ' + user.id + ': \n' + err));

                database.createSession(user.id, function(err, sessionId) {
                    if (err)
                        return next(new Error('Unable to create session for userid ' + userId +  ':\n' + err));

                    res.cookie('id', sessionId, sessionOptions);
                    res.redirect('/security?m=Password changed');
                });
            });
        });
    });
};

/**
 * GET
 * Restricted API
 * Deletes de email address without asking for confirmation
 **/
exports.deleteEmail = function(req, res, next) {
    var user = req.user;
    assert(user);
    if (user.email === null) return res.redirect('/security?m=No email');

    database.updateEmail(user.id, null, function(err) {
        if (err)
            return next(new Error('Unable to delete email: \n' + err));

        res.redirect('security?m=Email deleted');
    });
};

/**
 * POST
 * Restricted API
 * Adds an email to the account
 **/
exports.addEmail = function(req, res, next) {
    var user  = req.user;
    assert(user);
    user.deposit_address = lib.deriveAddress(user.id);

    var email = lib.removeNullsAndTrim(req.body.email);
    var password = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);

    var notValid = lib.isInvalidEmail(email);
    if (notValid) return res.redirect('/security?err=email invalid because: ' + notValid);

    notValid = lib.isInvalidPassword(password);
    if (notValid) return res.render('security?err=password not valid because: ' + notValid);

    database.validateUser(user.username, password, otp, function(err, userId) {
        if (err) {
            if (err === 'WRONG_PASSWORD') return res.redirect('/security?err=wrong%20password');
            if (err === 'INVALID_OTP') return res.redirect('/security?err=invalid%20one-time%20password');
            //Should be an user here
            return next(new Error('Unable to validate user adding email: \n' + err));
        }

        database.updateEmail(userId, email, function(err) {
            if (err)
                return next(new Error('Unable to update email: \n' + err));

            res.redirect('security?m=Email added');
        });
    });
};

/**
 * GET
 * Restricted API
 * Shows the security page of the users account
 **/
exports.security = function(req, res) {
    var user = req.user;
    assert(user);

    if (!user.mfa_secret) {
        user.mfa_potential_secret = speakeasy.generate_key({ length: 32 }).base32;
        var qrUri = 'otpauth://totp/MoneyPot:' + user.username + '?secret=' + user.mfa_potential_secret + '&issuer=MoneyPot';
        user.qr_svg = qr.imageSync(qrUri, { type: 'svg' });
        user.sig = lib.sign(user.username + '|' + user.mfa_potential_secret);
    }

    res.render('security', { user: user });
};

/**
 * POST
 * Restricted API
 * Enables the two factor authentication
 **/
exports.enableMfa = function(req, res, next) {
    var user = req.user;
    assert(user);

    var otp = lib.removeNullsAndTrim(req.body.otp);
    var sig = lib.removeNullsAndTrim(req.body.sig);
    var secret = lib.removeNullsAndTrim(req.body.mfa_potential_secret);

    if (user.mfa_secret) return res.redirect('/security?err=2FA%20is%20already%20enabled');
    if (!otp) return next('Missing otp in enabling mfa');
    if (!sig) return next('Missing sig in enabling mfa');
    if (!secret) return next('Missing secret in enabling mfa');

    if (!lib.validateSignature(user.username + '|' + secret, sig))
        return next('Could not validate sig');

    var expected = speakeasy.totp({ key: secret, encoding: 'base32' });

    if (otp !== expected) {
        user.mfa_potential_secret = secret;
        var qrUri = 'otpauth://totp/MoneyPot:' + user.username + '?secret=' + secret + '&issuer=MoneyPot';
        user.qr_svg = qr.imageSync(qrUri, {type: 'svg'});
        user.sig = sig;

        return res.render('security', { user: user, warning: 'Invalid 2FA token' });
    }

    database.updateMfa(user.id, secret, function(err) {
        if (err) return next(new Error('Unable to update 2FA status: \n' + err));
        res.redirect('/security?=m=Two-Factor%20Authentication%20Enabled');
    });
};

/**
 * POST
 * Restricted API
 * Disables the two factor authentication
 **/
exports.disableMfa = function(req, res, next) {
    var user = req.user;
    assert(user);

    var secret = lib.removeNullsAndTrim(user.mfa_secret);
    var otp = lib.removeNullsAndTrim(req.body.otp);

    if (!secret) return res.redirect('/security?err=Did%20not%20sent%20mfa%20secret');
    if (!user.mfa_secret) return res.redirect('/security?err=2FA%20is%20not%20enabled');
    if (!otp) return res.redirect('/security?err=No%20OTP');

    var expected = speakeasy.totp({ key: secret, encoding: 'base32' });

    if (otp !== expected)
        return res.redirect('/security?err=invalid%20one-time%20password');

    database.updateMfa(user.id, null, function(err) {
        if (err) return next(new Error('Error updating Mfa: \n' + err));

        res.redirect('/security?=m=Two-Factor%20Authentication%20Disabled');
    });
};

/**
 * POST
 * Public API
 * Send password recovery to an user if possible
 **/
exports.sendPasswordRecover = function(req, res, next) {
    var username = lib.removeNullsAndTrim(req.body.username);
    if (!username) return res.redirect('forgot-password');
    //We don't want to leak if the user has set his email so we send the same message for both
    var messageSentAndNotEmail = { success: 'We\'ve sent an email to you if there is a recovery email.' };
    var messageNotUser = { warning: 'That username does not exist :/' };

    database.getUserFromUsername (username, function(err, user) { 
        if (err) {
            if (err === 'NO_USER')
                return res.render('forgot-password', messageNotUser);
            else 
                return next(new Error('Unable to get user ' + user +  'from username: \n' + err));
        }
        if (!user.email)
            return res.render('forgot-password',  messageSentAndNotEmail);

        database.addRecoverId(user.id, function(err, recoveryId) { 
            if (err)
                return next(new Error('Unable to add recovery id ' + recoveryId + ' for user ' + user.id + ':\n' + err));

            assert(recoveryId);

            sendEmail.passwordReset(user.email, recoveryId, function(err) {
                if (err)
                    return next(new Error('Unable to send password email: \n' + err));
                return res.render('forgot-password',  messageSentAndNotEmail);
            });
        });
    });
};

/**
 * GET
 * Public API
 * reset the password of the user from the recoverId sent to his email
 **/
exports.resetForm = function(req, res, next) {
    var recoverId = req.params.recoverId;
    if (!recoverId || !lib.isUUIDv4(recoverId))
        return next('Invalid recovery id');

    database.getUserByRecoverId(recoverId, function(err, user) {
        if (err) {
            if (err === 'NOT_VALID_RECOVER_ID')
                return next('Invalid recovery id');
            return next(new Error('Unable to get user by recover id ' + recoverId + '\n' + err));
        }
        res.render('reset-password', { user: user, recoverId: recoverId });
    });
};

/**
 * POST
 * Public API
 * Receives the new password for the recovery and change it
 **/
exports.handleReset = function(req, res, next) {
    var recoverId = req.body.recover_id;
    var password = lib.removeNullsAndTrim(req.body.password);

    if (!recoverId || !lib.isUUIDv4(recoverId)) return next('Invalid recovery id');

    var notValid = lib.isInvalidPassword(password);
    if (notValid) return res.render('reset-password', { recoverId: recoverId, warning: 'password not valid because: ' + notValid });

    database.changePasswordFromRecoverId(recoverId, password, function(err, user) {
        if (err) {
            if (err === 'USER_NOT_FOUND')
                return next('Invalid recovery id');
            return next(new Error('Unable to change password for recoverId ' + recoverId + ', password: ' + password + '\n' + err));
        }
        database.createSession(user.id, function(err, sessionId) {
            if (err)
                return next(new Error('Unable to create session for password from recover id: \n' + err));

            res.cookie('id', sessionId, sessionOptions);
            res.redirect('/');
        });
    });
};

/**
 * GET
 * Restricted API
 * Shows the deposit history
 **/
exports.deposit = function(req, res, next) {
    var user = req.user;
    assert(user);

    database.getDeposits(user.id, function(err, deposits) {
        if (err) {
            return next(new Error('Unable to get deposits: \n' + err));
        }
        user.deposits = deposits;
        res.render('deposit', { user:  user });
    });
};

/**
 * GET
 * Restricted API
 * Shows the withdrawal history
 **/
exports.withdraw = function(req, res, next) {
    var user = req.user;
    assert(user);

    database.getWithdrawals(user.id, function(err, withdrawals) {
        if (err)
            return next(new Error('Unable to get withdrawals: \n' + err));

        withdrawals.forEach(function(withdrawal) {
            withdrawal.shortDestination = withdrawal.destination.substring(0,8);
        });
        user.withdrawals = withdrawals;

        res.render('withdraw', { user: user });
    });
};

/**
 * POST
 * Restricted API
 * Process a withdrawal
 **/
exports.handleWithdrawRequest = function(req, res, next) {
    var user = req.user;
    assert(user);

    var amount = req.body.amount;
    var destination = req.body.destination;
    var withdrawalId = req.body.withdrawal_id;
    var password = lib.removeNullsAndTrim(req.body.password);
    var otp = lib.removeNullsAndTrim(req.body.otp);

    var r =  /^[1-9]\d*(\.\d{0,2})?$/;
    if (!r.test(amount))
        return res.render('withdraw_request', { user: user, id: uuid.v4(),  warning: 'Not a valid amount' });

    amount = Math.round(parseFloat(amount) * 100);
    assert(Number.isFinite(amount));

    if (amount < 20000)
        return res.render('withdraw_request', { user: user,  id: uuid.v4(), warning: 'Must more 200 bits or more' });

    if (typeof destination !== 'string')
        return res.render('withdraw_request', { user: user,  id: uuid.v4(), warning: 'Destination address not provided' });

    try {
        var version = bitcoinjs.Address.fromBase58Check(destination).version;
        if (version !== bitcoinjs.networks.bitcoin.pubKeyHash && version !== bitcoinjs.networks.bitcoin.scriptHash)
            return res.render('withdraw_request', { user: user,  id: uuid.v4(), warning: 'Destination address is not a bitcoin one' });
    } catch(ex) {
        return res.render('withdraw_request', { user: user,  id: uuid.v4(), warning: 'Not a valid destination address' });
    }

    if (!password)
        return res.render('withdraw_request', { user: user,  id: uuid.v4(), warning: 'Must enter a password' });

    if(!lib.isUUIDv4(withdrawalId))
      return res.render('withdraw_request', { user: user,  id: uuid.v4(), warning: 'Could not find a one-time token' });

    database.validateUser(user.username, password, otp, function(err) {

        if (err) {
            if (err === 'WRONG_PASSWORD')
                return res.render('withdraw_request', { user: user, id: uuid.v4(), warning: 'wrong password, try it again...' });
            if (err === 'INVALID_OTP')
                return res.render('withdraw_request', { user: user, id: uuid.v4(), warning: 'invalid one-time token' });
            //Should be an user
            return next(new Error('Unable to validate user handling withdrawal: \n' + err));
        }

        withdraw(req.user.id, amount, destination, withdrawalId, function(err) {
            if (err) {
                if (err === 'NOT_ENOUGH_MONEY')
                    return res.render('withdraw_request', {user: user, id: uuid.v4(), warning: 'Not enough money to process withdraw.'});
                else if (err === 'PENDING') //TODO: Whats with this error code?
                    return res.render('withdraw_request', { user: user,  id: uuid.v4(), success: 'Withdrawal successful, however hot wallet was empty. Withdrawal will be reviewed and sent ASAP' });
                else if(err === 'SAME_WITHDRAWAL_ID')
                    return res.render('withdraw_request', {user: user,  id: uuid.v4(), warning: 'Please reload your page, it looks like you tried to make the same transaction twice.'});
                else if(err === 'FUNDING_QUEUED')
                    return res.render('withdraw_request', {user: user,  id: uuid.v4(), success: 'Your transaction is being processed come back later to see the status.'});
                else
                    return next(new Error('Unable to withdraw: \n' + err));
            }
            return res.render('withdraw_request', { user: user, id: uuid.v4(), success: 'OK' });
        });
    });
};

/**
 * GET
 * Restricted API
 * Shows the withdrawal request page
 **/
exports.withdrawRequest = function(req, res) {
    assert(req.user);
    res.render('withdraw_request', { user: req.user, id: uuid.v4() });
};

/**
 * GET
 * Restricted API
 * Shows the support page
 **/
exports.contact = function(req, res) {
    assert(req.user);
    res.render('support', { user: req.user })
};
