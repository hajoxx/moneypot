define([
    'components/Controls',
    'components/StrategyEditor',
    'stores/controlsSelectorStore',
    'actions/ControlsSelectorActions',
    'lib/react'
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
            //Check if its mounted because when Game view receives the disconnect event from EngineVirtualStore unmounts all views
            //and the views unregister their events before the event dispatcher dispatch them with the disconnect event
            if(this.isMounted())
                this.setState(getState());
        },

        //_toggleControl: function() {
        //    ControlsSelectorActions.toggleControl();
        //},

        _selectControl: function(controlName) {
            return function() {
                ControlsSelectorActions.selectControl(controlName);
            }
        },

        render: function() {

            //var tabText = this.state.selectedControl === 'manual'? 'Strategy' : 'Controls';

            return D.div({ id: 'controls-selector-container' },
                D.div({ className: 'buttons-container' },
                    D.div({ className: 'button-holder' + (this.state.selectedControl === 'manual'? ' tab-active' : ''), onClick: this._selectControl('manual') },
                        D.a(null,  'Manual' )
                    ),
                    D.div({ className: 'button-holder' + (this.state.selectedControl === 'strategy'? ' tab-active' : ''), onClick: this._selectControl('strategy') },
                        D.a(null,  'Auto' )
                    )
                ),

                D.div({ className: 'controls-widget-container' },
                    this.state.selectedControl === 'manual'?
                        Controls() :
                        StrategyEditor()
                )
            )
        }
    });

});