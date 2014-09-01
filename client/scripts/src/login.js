define(['src/fb'], function(FB) {

    function gather(fbResponse) {
        var accessToken = fbResponse.authResponse.accessToken;
        var expiresIn = fbResponse.authResponse.expiresIn;
        var expires = (new Date().getTime() / 1000) + expiresIn - 5; // remove 5 seconds for network lag
        window.localStorage.setItem('fb-token', accessToken);
        window.localStorage.setItem('expires', expires);

        return {
            token: accessToken,
            expires: expires
        };
    }

    return {
        getLoginStatus: function(callback) {

            FB.getLoginStatus(function(response) {

                if (response.status === 'connected') {
                    var status = gather(response);

                    return callback(null, status);
                } else if (response.status === 'not_authorized') {
                    return callback(null, null);

                } else {

                    return callback(null, false);
                }
            });

        },

        logout: function(callback) {

            FB.logout(function(res) {
                callback();
            });
        },

        login: function(callback) {
           FB.login(function(response) {
               if (response.status === 'connected') {
                   var status = gather(response);
                   callback(null, status);
               } else
                   callback(null, false);

            });
        },

        getAccessToken: function(callback) {
            FB.getAccessToken(function(response) {
                callback(response);
            });
        }

    };
});
