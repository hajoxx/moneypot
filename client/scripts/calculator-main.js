define([
    'lib/react',
    'components2/calculator'
], function(React, Calculator) {

    React.renderComponent(
        Calculator(null),
        document.getElementById('calculator')
    );

});

