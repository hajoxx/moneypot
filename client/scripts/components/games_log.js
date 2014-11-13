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
                var cashed_at, bet, profit, bonus;
                var player = game.player_info[self.props.engine.username];

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

                return D.tr({ key: 'game_' + i, onClick: self.gameDetails(game.game_id) },
                    D.td(null, Clib.formatSatoshis(game.game_crash), D.i(null, 'x')),
                    D.td(null, cashed_at),
                    D.td(null, bet),
                    D.td(null, bonus),
                    D.td(null, profit)
                );
            });

            return D.table({ className: 'games-log' },
                D.thead(null,
                    D.tr(null,
                        D.th(null, 'Crash'),
                        D.th(null, '@'),
                        D.th(null, 'Bet'),
                        D.th(null, 'Bonus'),
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