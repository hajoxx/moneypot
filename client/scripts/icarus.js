define([
    'lib/react',
    'lib/clib'
], function(React, Clib) {

    var D = React.DOM;

    function Data() {
        this.last = 0;
        this.arr = [];
        this.length = 25;

        for (var i = 0; i < this.length; ++i)
            this.append();
    }

    Data.prototype.append = function() {
        var b = Math.random() <= 0.501;
        if (b)
            this.last++;
        else
            this.last=0;
        this.arr.push(this.last);

        if (this.arr.length > this.length)
            this.arr.shift();
    };


    var Canvas = React.createClass({
        render: function() {
            return D.canvas({ width: this.width, height: this.height});
        },

        componentDidMount: function() {
            this.draw();

            var self = this;
            setInterval(function() {
                self.data.append();
                self.draw();
            }, 1000);
        },

        width: 400,
        height: 300,

        data: new Data(),

        draw: function() {
            var ctx = this.getDOMNode().getContext('2d');

            this.drawBorder();
        },


        drawBorder: function() {
            var ctx = this.getDOMNode().getContext('2d');


            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'black';


            ctx.fillStyle = '#282828';
            ctx.fillRect(0, 0, this.width, this.height);


            // draw the horizontal lines
            ctx.lineWidth = 0.5;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'grey';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // draw the vertical lines

            var widthPerData = this.width / this.data.length;

            for (var i = 1; i <= this.data.length; ++i) {
                ctx.beginPath();
                var x = i * widthPerData;
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.height);
                ctx.stroke();
            }

            var levels = 20;
            var perLevel = this.height / levels;
            for (var i = 1; i <= levels; ++i) {
                var y = this.height - perLevel * i;
                ctx.fillText(i.toString(), this.width - widthPerData/2, y + perLevel/2);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
                ctx.stroke();
            }

            var x = 0;
            var y = this.height;

            // draw the data

            ctx.lineWidth = 5;
            ctx.fillStyle = '#6699FF'; // a dark blue

            for (var i = 0; i < this.data.length; ++i) {
                ctx.beginPath();
                ctx.moveTo(x, this.height);
                ctx.lineTo(x, y);

                x += widthPerData;
                var n = this.data.arr[i];
                var y = this.height - n * perLevel;

                ctx.quadraticCurveTo(x - widthPerData, y, x, y);
                //ctx.quadraticCurveTo(x, y + perLevel, x, y);

                ctx.lineTo(x, this.height);
                ctx.fill();
            }
        }
    });

    var Beter = React.createClass({

        displayName: 'Controls',

        propTypes: {
            engine: React.PropTypes.object.isRequired,
            tentativeFlightLevel: React.PropTypes.number.isRequired,
            setTentativeFlightLevel: React.PropTypes.func.isRequired
        },

        getInitialState: function() {
           return {
               rewardText: 1
           };
        },

        setRewardText: function(e) {
            this.setState({ rewardText: e.target.value });
        },

        invalidInputError: function() {
            var reward = parseFloat(this.state.rewardText);
            if (Number.isNaN(reward))
                return 'Invalid reward amount';
            if (reward <= 0)
                return 'Reward must be positive';
            var flight = parseInt(this.props.tentativeFlightLevel);
            if (Number.isNaN(flight))
                return 'Invalid flight height';
            return null;
        },

        waveCrashLoss: function() {
            var reward = Math.round(parseFloat(this.state.rewardText) * 100);
            console.assert(Number.isFinite(reward));
            var level = parseInt(this.props.tentativeFlightLevel);
            console.assert(Number.isFinite(level));


            return reward * (Math.pow(2, level) - 1);
        },

        render: function () {

            var status = this.invalidInputError();
            if (!status) {
                status = D.small(null,
                    'You will lose ', D.strong(null, Clib.formatSatoshis(this.waveCrashLoss()), ' bits'), ' if you crash');
            }

            return D.div({ style: { padding: '10px' }},
                'Reward: ',
                 D.input({ type: 'number', value: this.state.rewardText, onChange: this.setRewardText, min: 0.01, step: 0.01 }),
                ' bits @ flight level: ',
                 D.input({ type: 'number', value: this.state.flightLevel, onChange: this.tentativeFlightLevel, min: 1, max: 20 }),
                 D.br(null),
                status, D.br()
            );
        }
    });

    var Engine = function() {
        this.balance = 200;
    };

    // Given the current balance, and reward, what is the max we could bet
    Engine.prototype.maxLevel = function(reward) {
            return Math.floor(
                    Math.log((reward + this.balance) / reward) /
                    Math.log(2)
            );
    };

    var engine = new Engine();

    var Window = React.createClass({

        getInitialState: function() {
            return {
                tentativeFlightLevel: 4 // might also be a string..
            };
        },

        setTentativeFlightLevel: function(flightLevel) {
           this.setState({ tentativeFlightLevel: flightLevel });
        },

        render: function() {
            return D.div(null,
                'Balance: ', engine.balance, D.br(),
                Canvas({
                    engine: engine,
                    tentativeFlightLevel: this.state.tentativeFlightLevel
                }),
                Beter({
                    engine: engine,
                    tentativeFlightLevel: this.state.tentativeFlightLevel,
                    setTentativeFlightLevel: this.setTentativeFlightLevel
                })
            );
        }
    });


    React.renderComponent(
        Window(null),
        document.getElementById('game')
    );

});