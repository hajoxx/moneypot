define(['lib/react', 'lib/clib'], function(React, Clib) {
    var D = React.DOM;

    var maxGamesShowed = 10;

    return React.createClass({
        displayName: 'gamesLog',

        propTypes: {
            engine: React.PropTypes.object.isRequired
        },

        gameDetails: function (gameId) {
            return function () {
                window.open('/game/' + gameId, '_blank');
            }
        },

        render: function () {
            var self = this;



            var rows = self.props.engine.tableHistory.slice(0, maxGamesShowed).map(function (game, i) {
                var cashed_at, bet, profit;

                var player = game.player_info[self.props.engine.username];
                if (player) {
                    bet = Clib.formatSatoshis(player.bet);

                    if (player.stopped_at) {
                        profit = Clib.formatSatoshis(((player.stopped_at / 100) * player.bet) - player.bet);
                        cashed_at = Clib.formatSatoshis(player.stopped_at);
                    } else {
                        profit = Clib.formatSatoshis(-player.bet);
                        cashed_at = '-';
                    }

                    //If we got a bonus
                    if (player.bonus)
                        profit = profit + ' (+' + Clib.formatSatoshis(player.bonus) + ')';

                    //If we did'nt play
                } else {
                    cashed_at = '-';
                    bet = '-';
                    profit = '-';
                }

                return D.tr({ key: 'game_' + i, onClick: self.gameDetails(game.game_id) },
                    D.td(null, Clib.formatSatoshis(game.game_crash), D.i(null, 'x')),
                    D.td(null, cashed_at),
                    D.td(null, bet),
                    D.td(null, profit)
                );
            });

            return D.table({ className: 'games-log' },
                D.thead(null,
                    D.tr(null,
                        D.th(null, 'Crash'),
                        D.th(null, '@'),
                        D.th(null, 'Bet'),
                        D.th(null, 'Profit')
                    )
                ),
                D.tbody(null,
                    rows
                )
            );
        }

    });
});