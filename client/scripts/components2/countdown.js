define(['lib/react'], function(React) {
    var D = React.DOM;

    return React.createClass({
        displayName: 'Timer',

        propTypes: {
            engine: React.PropTypes.object.isRequired
        },

        getInitialState: function() {
            return {
                countdown: 0
            }
        },

        interval: null,

        componentWillMount: function() {
            this.interval = setInterval(this.update, 1000);
            this.update();
        },

        componentWillUnmount: function() {
            clearInterval(this.interval);
        },

        update: function() {
            var countdown = Math.ceil(this.props.engine.nextGameIn() / 1000);
            this.setState({ countdown: countdown });
        },

        render: function() {
            return D.span(null, 'The game is starting in ', D.b(null, this.state.countdown));
        }
    });
});
