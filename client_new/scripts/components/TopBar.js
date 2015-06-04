define([
   'lib/react',
    'game-logic/engine',
    'lib/clib'
], function(
    React,
    Engine,
    Clib
) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'TopBar',

        getInitialState: function() {
            return {
                username: Engine.username, //Falsy value if not logged in
                balanceBitsFormatted: Clib.formatSatoshis(Engine.balanceSatoshis),
                theme: 'black' //black || white
            }
        },

        componentDidMount: function() {
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                cashed_out: this._onChange
            });
        },

        componentWillUnmount: function() {
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                cashed_out: this._onChange
            });
        },

        _onChange: function() {
            this.setState({
                balanceBitsFormatted: Clib.formatSatoshis(Engine.balanceSatoshis)
            });
        },

        _toggleTheme: function() {
            if(this.state.theme === 'black') {
                Clib.loadCss('css/whiteTheme.css', 'css-theme-white');
                this.setState({theme: 'white'});
            } else {
                Clib.removeCss('css-theme-white');
                this.setState({theme: 'black'});
            }
        },

        render: function() {

            var userLogin;
            if(this.state.username) {
                userLogin = D.div({ className: 'user-login' },
                    D.div({ className: 'balance-bits' },
                        D.span(null, 'Bits: '),
                        D.span({ className: 'balance' }, this.state.balanceBitsFormatted )
                    ),
                    D.div({ className: 'username' },
                        D.a({ href: '/account'}, this.state.username
                    ))
                );
            } else {
                userLogin = D.div({ className: 'user-login' },
                    D.div({ className: 'register' },
                        D.a({ href: '/register' }, 'Register' )
                    ),
                    D.div({ className: 'login' },
                        D.a({ href: '/login'}, 'Log in' )
                    )
                );
            }

            return D.div({ id: 'top-bar' },
                D.div({ className: 'title' },
                    D.a({ href: '/' },
                        D.h1(null, 'bustabit')
                    )
                ),
                userLogin,
                D.div({ className: 'toggle-view noselect' + ((this.state.theme === 'white')? ' black' : ' white'), onClick: this._toggleTheme },
                    D.a(null,
                        (this.state.theme === 'white')? 'Go black' : 'Go back'
                    )
                )
            )
        }
    });
});