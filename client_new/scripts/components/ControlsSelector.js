define([
    'components/Controls',
    'components/StrategyEditor',
    'stores/controlsSelectorStore',
    'actions/ControlsSelectorActions',
    'react'
], function(
    ControlsClass,
    StrategyEditorClass,
    ControlsSelectorStore,
    ControlsSelectorActions,
    React
) {
    var D = React.DOM;
    var StrategyEditor = React.createFactory(StrategyEditorClass);
    var Controls = React.createFactory(ControlsClass);

    function getState(){
        return ControlsSelectorStore.getState();
    }

    return React.createClass({
        displayName: 'ControlsSelector',

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired
        },

        getInitialState: function () {
            return getState();
        },

        componentDidMount: function() {
            ControlsSelectorStore.addChangeListener(this._onChange);
        },

        componentWillUnmount: function() {
            ControlsSelectorStore.removeChangeListener(this._onChange);
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState(getState());
        },

        _selectControl: function(controlName) {
            return function() {
                ControlsSelectorActions.selectControl(controlName);
            }
        },

        render: function() {

            return D.div({ id: 'controls-selector-container' },
                D.div({ className: 'buttons-container noselect' },
                    D.div({ className: 'button-holder' + (this.state.selectedControl === 'manual'? ' tab-active' : ''), onClick: this._selectControl('manual') },
                        D.a(null,  'Manual' )
                    ),
                    D.div({ className: 'button-holder' + (this.state.selectedControl === 'strategy'? ' tab-active' : ''), onClick: this._selectControl('strategy') },
                        D.a(null,  'Auto' )
                    )
                ),

                D.div({ className: 'controls-widget-container' },
                    this.state.selectedControl === 'manual'?
                        Controls({
                            isMobileOrSmall: this.props.isMobileOrSmall
                        }) :
                        StrategyEditor()
                )
            )
        }
    });

});