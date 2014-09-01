define([
    'lib/react',
    'components/calculator'
], function(React, Calculator) {

    React.renderComponent(
        Calculator(null),
        document.getElementById('calculator')
    );

});

