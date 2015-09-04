define([
    'react',
    'stores/GameSettingsStore',
    'game-logic/ChatEngineStore',
    'actions/ChatSettingsActions'
], function(
    React,
    GameSettingsStore,
    Chat,
    ChatSettingsActions
) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'ChatSettings',

        getInitialState: function() {
            return getState();
        },

        componentDidMount: function() {
            Chat.on('all', this._onChange);
        },

        componentWillUnmount: function() {
            Chat.off('all', this._onChange);
        },

        _onChange: function() {
            if(this.isMounted())
                this.setState({ chat: Chat });
        },

        _setBotsDisplayMode: function(e) {
            ChatSettingsActions.setBotsDisplayMode(e.target.value);
        },

        render: function() {
            return D.div({ id: 'chat-settings-container' },

                D.div({ className: 'option-row' },
                    D.span({ className: 'option-text' }, 'Bots Display Mode'),
                    D.select({ value: Chat.botsDisplayMode, onChange: this._setBotsDisplayMode },
                        D.option({ value: 'normal' }, 'Normal'),
                        D.option({ value: 'greyed' }, 'Greyed Out'),
                        D.option({ value: 'none' }, "Don't display"))

                )
            )
        }

    });

});