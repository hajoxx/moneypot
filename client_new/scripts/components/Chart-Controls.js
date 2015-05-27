define([
    'lib/react',
    'components/Chart',
    'components/ControlsSelector'
], function(
    React,
    ChartClass,
    ControlsSelectorClass
) {
    var D = React.DOM;

    var Chart =  React.createFactory(ChartClass);
    var ControlsSelector = React.createFactory(ControlsSelectorClass);

    return React.createClass({
        displayName: 'Chart-Controls',

        render: function() {
            return D.div({ id: 'chart-controls-inner-container' },
                D.div({ id: 'chart-container' },
                    Chart()
                ),
                D.div({ id: 'controls-container' },
                    ControlsSelector()
                )
            );
        }
    });
});