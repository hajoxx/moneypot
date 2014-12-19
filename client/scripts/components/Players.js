define([
    'lib/react',
    'lib/clib',
    'lib/lodash',
    'stores/EngineVirtualStore'
], function(
    React,
    Clib,
    _,
    EngineVirtualStore
){

    var D = React.DOM;

    function calcProfit(bet, stoppedAt) {
        return ((stoppedAt - 100) * bet)/100;
    }

    function getState(){
        return {
            engine: EngineVirtualStore.getState()
        }
    }

    return React.createClass({
        displayName: 'usersPlaying',

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

        render: function() {
            var self = this;

            var usersWonCashed = [];
            var usersLostPlaying = [];

            var trUsersWonCashed;
            var trUsersLostPlaying;

            var tBody;

            var containerClass;
            var tableClass;

            if (self.state.engine.gameState === 'STARTING') {
                usersLostPlaying = self.state.engine.joined.map(function(player) {
                    var bet; // can be undefined

                    if (player === self.state.engine.username)
                        bet = self.state.engine.nextBetAmount;

                    return { username: player, info: { bet: bet } };
                });
            } else {

                //In progress: Users with cashed out are users chased
                //Ended: Users with cashed are users Won
                _.forEach(self.state.engine.playerInfo, function (value, key) {
                    if (value.stopped_at)
                        usersWonCashed.push({ username: key, info: value });
                    else
                        usersLostPlaying.push({ username: key, info: value });
                });

                usersWonCashed.sort(function(a, b) {
                    var r = b.info.stopped_at - a.info.stopped_at;
                    if (r !== 0) return r;
                    return a.username < b.username ? 1 : -1;
                });

                usersLostPlaying.sort(function(a, b) {
                    var r = b.info.bet - a.info.bet;
                    if (r !== 0) return r;
                    return a.username < b.username ? 1 : -1;
                });

            }

            //Users Playing and users cashed
            if(self.state.engine.gameState === 'IN_PROGRESS' || self.state.engine.gameState === 'STARTING') {

                trUsersLostPlaying = [];
                for(var i=0, length = usersLostPlaying.length; i < length; i++) {

                    trUsersLostPlaying.push( D.tr({ className: 'user-playing', key: 'user' + i },
                        D.td(null, D.a({ href: '/user/' + usersLostPlaying[i].username,
                                target: '_blank'
                            },
                            usersLostPlaying[i].username)),
                        D.td(null, '-'),
                        D.td(null,
                            usersLostPlaying[i].info.bet ? Clib.formatSatoshis(usersLostPlaying[i].info.bet, 0) : '?'
                        ),
                        D.td(null, '-'),
                        D.td(null, '-')
                    ));
                }

                trUsersWonCashed = [];
                for (var i=0, length = usersWonCashed.length; i < length; i++) {
                    var user = usersWonCashed[i];
                    var bet = user.info.bet;
                    var profit = calcProfit(bet, user.info.stopped_at);
                    trUsersWonCashed.push( D.tr({ className: 'user-cashed', key: 'user' + i },
                        D.td(null, D.a({ href: '/user/' + user.username,
                                target: '_blank'
                            },
                            user.username)),
                        D.td(null, user.info.stopped_at/100 + 'x'),
                        D.td(null, Clib.formatSatoshis(bet, 0)),
                        D.td(null, '-'),
                        D.td(null, Clib.formatSatoshis(profit))
                    ));
                }

                tBody = D.tbody({ className: '' },
                    trUsersLostPlaying,
                    trUsersWonCashed
                );

                containerClass = 'users-playing-container';
                tableClass = 'users-playing';

                //Users Lost and users Won
            } else if(self.state.engine.gameState === 'ENDED') {

                trUsersLostPlaying = usersLostPlaying.map(function(entry, i) {
                    var bet = entry.info.bet;
                    var bonus = entry.info.bonus;
                    var profit = -bet;

                    if (bonus) {
                        profit = Clib.formatSatoshis(profit + bonus);
                        bonus = Clib.formatDecimals(bonus*100/bet, 2)+'%';
                    } else {
                        profit = Clib.formatSatoshis(profit);
                        bonus = '0%';
                    }

                    return D.tr({ className: 'user-lost', key: 'user' + i },
                        D.td(null, D.a({ href: '/user/' + entry.username,
                                target: '_blank'
                            },
                            entry.username)),
                        D.td(null, '-'),
                        D.td(null, Clib.formatSatoshis(entry.info.bet, 0)),
                        D.td(null, bonus),
                        D.td(null, profit)
                    );
                });

                trUsersWonCashed = usersWonCashed.map(function(entry, i) {
                    var bet = entry.info.bet;
                    var bonus = entry.info.bonus;
                    var stopped = entry.info.stopped_at;
                    var profit = bet * (stopped - 100) / 100;

                    if (bonus) {
                        profit = Clib.formatSatoshis(profit + bonus);
                        bonus = Clib.formatDecimals(bonus*100/bet, 2)+'%';
                    } else {
                        profit = Clib.formatSatoshis(profit);
                        bonus = '0%';
                    }

                    return D.tr(
                        { className: 'user-won', key: 'user' + i },
                        D.td(null, D.a({ href: '/user/' + entry.username,
                                target: '_blank'
                            },
                            entry.username)),
                        D.td(null, stopped / 100, 'x'),
                        D.td(null, Clib.formatSatoshis(bet, 0)),
                        D.td(null, bonus),
                        D.td(null, profit)
                    );
                });


                tBody = D.tbody({ className: '' },
                    trUsersLostPlaying,
                    trUsersWonCashed
                );

                containerClass = 'users-cashed-container';
                tableClass = 'users-summary';
            }

            return D.div({ className: containerClass },
                D.table({ className: tableClass },
                    D.thead(null,
                        D.tr(null,
                            D.th(null, 'User'),
                            D.th(null, '@'),
                            D.th(null, 'Bet'),
                            D.th(null, 'Bonus'),
                            D.th(null, 'Profit')
                        )
                    ),
                    tBody
                )
            );
        }

    });

});