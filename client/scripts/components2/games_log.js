define(['lib/react', 'lib/clib'], function(React, Clib) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'gamesLog',

        propTypes: {
            engine: React.PropTypes.object.isRequired
        },

        componentWillMount: function() {
            this.maxGamesShowed = 10;
        },

        gameDetails: function(gameId) {
            return function() {
                window.open('/game/'+gameId, '_blank');
            }
        },

        render: function() {
            var rows = [];
            var gamesList = this.props.engine.tableHistory;
            console.log('Games list: ', gamesList);
            var cashed_at, bet, profit;

            for(var i = 0; i < this.maxGamesShowed; i++) {

                //If we played this game
                var player = gamesList[i].player_info[this.props.engine.username];
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

                rows.push(D.tr({ key: 'game_' + i, onClick: this.gameDetails(gamesList[i].game_id) },
                    D.td(null, Clib.formatSatoshis(gamesList[i].game_crash), D.i(null, 'x')),
                    D.td(null, cashed_at),
                    D.td(null, bet),
                    D.td(null, profit)
                ));
            }

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