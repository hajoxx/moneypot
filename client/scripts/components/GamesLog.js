define([
    'lib/react',
    'lib/clib',
    'stores/EngineVirtualStore'
], function(
    React,
    Clib,
    EngineVirtualStore
){

    /** Constants **/
    var MAX_GAMES_SHOWED = 10;

    var D = React.DOM;

    function getState(){
        return {
            engine: EngineVirtualStore.getState()
        }
    }

    function copyHash(gameId, hash) {
        return function() {
            prompt('Game ' + gameId + ' Hash: ', hash);
        }
    }



    return React.createClass({
        displayName: 'gamesLog',

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            EngineVirtualStore.addChangeListener(this._onChange);
        },

        componentWillUnmount: function() {
            EngineVirtualStore.removeChangeListener(this._onChange);
        },

        _onChange: function() {
            //Check if its mounted because when Game view receives the disconnect event from EngineVirtualStore unmounts all views
            //and the views unregister their events before the event dispatcher dispatch them with the disconnect event
            if(this.isMounted())
                this.setState(getState());
        },

        _gameDetails: function (gameId) {
            return function () {
                window.open('/game/' + gameId, '_blank');
            }
        },

        render: function () {
            var self = this;

            var rows = self.state.engine.tableHistory.slice(0, MAX_GAMES_SHOWED).map(function (game, i) {
                var cashed_at, bet, profit, bonus;
                var player = game.player_info[self.state.engine.username];

                if (player) {
                    bonus = player.bonus;
                    bet = player.bet;

                    //If the player won
                    if (player.stopped_at) {
                        profit = ((player.stopped_at / 100) * player.bet) - player.bet;
                        cashed_at = Clib.formatSatoshis(player.stopped_at);

                        //If the player lost
                    } else {
                        profit = -bet;
                        cashed_at = '-';
                    }

                    //If we got a bonus
                    if (bonus) {
                        profit = profit + bonus;
                        bonus = Clib.formatDecimals(bonus*100/bet, 2)+'%';
                    } else {
                        bonus = '0%';
                    }

                    profit = Clib.formatSatoshis(profit);
                    bet = Clib.formatSatoshis(bet);

                    //If we didn't play
                } else {
                    cashed_at = '-';
                    bet = '-';
                    profit = '-';
                    bonus = '-';
                }

                var className;
                if (game.game_crash >= 198)
                    className = 'games-log-goodcrash';
                else if (game.game_crash <= 196)
                    className = 'games-log-badcrash';
                else
                    className = '';

                return D.tr({ key: 'game_' + i },

                    D.td(null,
                        D.a({ href: '/', target: '_blank',
                            className: className
                        },
                            Clib.formatSatoshis(game.game_crash), D.i(null, 'x'))
                        ),
                    D.td(null, cashed_at),
                    D.td(null, bet),
                    D.td(null, bonus),
                    D.td(null, profit),
                    D.td(null,
                        D.input({type: 'input', className: 'games-log-hash', readOnly: true, value: game.hash }),
                        D.div({ className: 'hash-copy-cont', onClick: copyHash(game.game_id, game.hash) },
                            D.span({ className: 'hash-copy' }, D.i({ className: 'fa fa-clipboard' })))
                    )

                );
            });

            return D.table({ className: 'games-log' },
                D.thead(null,
                    D.tr(null,

                        D.th(null, 'Crash'),
                        D.th(null, '@'),
                        D.th(null, 'Bet'),
                        D.th(null, 'Bonus'),
                        D.th(null, 'Profit'),
                        D.th(null, 'Hash')
                    )
                ),
                D.tbody(null,
                    rows
                )
            );
        }

    });

});