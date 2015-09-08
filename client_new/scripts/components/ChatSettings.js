define([
    'react',
    'stores/GameSettingsStore',
    'game-logic/ChatEngineStore',
    'actions/ChatSettingsActions'
], function(
    React,
    GameSettingsStore,
    ChatEngineStore,
    ChatSettingsActions
) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'ChatSettings',

        componentDidMount: function() {
            ChatEngineStore.on('all', this._onChange);
        },

        componentWillUnmount: function() {
            ChatEngineStore.off('all', this._onChange);
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState({ chat: ChatEngineStore });
        },

        _setBotsDisplayMode: function(e) {
            ChatSettingsActions.setBotsDisplayMode(e.target.value);
        },

        render: function() {
            return D.div({ id: 'chat-settings-container' },

                D.div({ className: 'option-row' },
                    D.span({ className: 'option-text' }, 'Bots Display Mode'),
                    D.select({ value: ChatEngineStore.botsDisplayMode, onChange: this._setBotsDisplayMode },
                        D.option({ value: 'normal' }, 'Normal'),
                        D.option({ value: 'greyed' }, 'Greyed Out'),
                        D.option({ value: 'none' }, "Don't display"))

                )
            )
        }

    });

});