define([
    'lib/react',
    'components2/game',
    'lib/socket.io-1.0.6',
    'lib/clib',
    'engine'
], function(React, Game, io, Clib, Engine) {

    var engine = new Engine();

    engine.on('all', function(eventName) {
        render();
    });

    render();

    var elem = document.getElementById('balance_bits');

    function render() {

        React.renderComponent(
            Game({ engine: engine }),
            document.getElementById('game')
        );

        if (elem)
            elem.innerHTML = Clib.formatSatoshis(engine.balanceSatoshis);
    }

});

