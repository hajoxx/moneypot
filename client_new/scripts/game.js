define([
    'react',
    'components/Game'
], function(
    React,
    GameClass
) {

    var Game = React.createFactory(GameClass);

    React.render(
        Game(),
        document.getElementById('game-container')
    );
});