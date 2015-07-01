define([
   'react',
    'components/DisplaySettings',
    'components/HotkeysSettings'
], function(
    React,
    DisplaySettingsClass,
    HotkeysSettingsClass
) {
    var D = React.DOM;

    var DisplaySettings = React.createFactory(DisplaySettingsClass);
    var HotkeysSettings = React.createFactory(HotkeysSettingsClass);

    return React.createClass({
        displayName: 'Settings',

        getInitialState: function() {
            return {
                selectedTab: 'display' //display || hotkeys
            }
        },

        _selectTab: function(tabName) {
            var self = this;
            return function() {
                self.setState({ selectedTab: tabName });
            }
        },

        render: function() {
            return D.div({ id: 'settings-selector-container' },
                D.div({ className: 'tabs-container noselect' },
                    D.div({ className: 'tab-holder' + (this.state.selectedTab === 'display'? ' tab-active' : ''), onClick: this._selectTab('display') },
                        D.a(null,  'Display' )
                    ),
                    D.div({ className: 'tab-holder' + (this.state.selectedTab === 'hotkeys'? ' tab-active' : ''), onClick: this._selectTab('hotkeys') },
                        D.a(null,  'Hotkeys' )
                    )
                ),

                D.div({ className: 'settings-widget-container' },
                    this.state.selectedTab === 'display'?
                        DisplaySettings() :
                        HotkeysSettings()
                )
            )
        }
    });
});