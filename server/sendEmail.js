var assert = require('assert');
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');

var siteURL = process.env.SITE_URL || 'https://www.bustabit.com';


function send(details, callback) {
    assert(details, callback);

    var transport = nodemailer.createTransport(sesTransport({
        AWSAccessKeyID: process.env.AWS_SES_KEY,
        AWSSecretKey: process.env.AWS_SES_SECRET
    }));

    transport.sendMail(details, function(err) {
        if (err)
            return callback(err);

        callback(null);
    });
}

exports.contact = function(from, content, user, callback) {

    var details = {
        to: process.env.CONTACT_EMAIL || 'ryan@moneypot.com',
        from: 'contact@moneypot.com',
        replyTo: from,
        subject: 'Moneypot Contact (' + from + ')',
        html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
            '<html xmlns="http://www.w3.org/1999/xhtml">' +
            '<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' +
            '<title>MoneyPot</title>' +
            '</head>' +
            '<body>'+
            '<table width="100%" cellpadding="0" cellspacing="0" bgcolor="e4e4e4"><tr><td> <table id="top-message" cellpadding="20" cellspacing="0" width="600" align="center"> <tr> <td></td> </tr> </table> <table id="main" width="600" align="center" cellpadding="0" cellspacing="15" bgcolor="ffffff"> <tr> <td> <table id="content-1" cellpadding="0" cellspacing="0" align="center"> <tr> <td width="570" valign="top"> <table cellpadding="5" cellspacing="0"> <div style="background-color:#000;"> <div style="text-align:center;margin-left: 230"> </div> </div> </td> </tr> </table> </td> </tr> <tr> <td> <table id="content-6" cellpadding="0" cellspacing="0"> <p> ' + content +' </p> </table> </td> </tr> </table> </td></tr></table>'+
            '</body></html>'
    };
    send(details, callback);
};

exports.passwordReset = function(to, recoveryId, callback) {
    var details =  {
        to: to,
        from: 'noreply@moneypot.com',
        subject: 'MoneyPot.com - Reset Password Request',
        html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
            '<html xmlns="http://www.w3.org/1999/xhtml">' +
            '<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' +
            '<title>MoneyPot</title>' +
            '</head>' +
            '<body>'+
            '<a href="' + siteURL + '/reset/' + recoveryId +'">Please click here to reset your password</a>' +
            '</body></html>'
    };
    send(details, callback);
};
