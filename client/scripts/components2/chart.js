define(['lib/react', 'lib/clib', 'components2/graph'],

    function(React, Clib, Graph) {
        var D = React.DOM;

        return React.createClass({
            displayName: 'Chart',

            propType: {
                engine: React.PropTypes.object.isRequired
            },

            componentWillMount: function() {
                var width;

                window.onresize=function() {
                    if (window.innerWidth > 767) {
                        if((window.innerWidth) < 1000) {
                            width = Math.floor(window.innerWidth * 0.58);
                        } else {
                            width = 600;
                        }
                    } else {
                        width = window.innerWidth * 0.9;
                    }
                    self.graph = new Graph(width, 300);
                };

                if (window.innerWidth > 767) {
                    if((window.innerWidth) < 1000) {
                        width = Math.floor(window.innerWidth * 0.58);
                    } else {
                        width = 600;
                    }
                } else {
                    width = window.innerWidth * 0.9;
                }

                this.graph = new Graph(width, 300);
            },

            componentWillUnmount: function() {
                this.mounted = false;
            },

            componentDidMount: function() {
                this.mounted = true;
                this.animRequest = window.requestAnimationFrame(this.draw);
            },

            draw: function() {
                if(this.mounted) {
                    var canvas = this.getDOMNode();
                    if (!canvas.getContext) {
                        console.log('No canvas');
                        return;
                    }
                    var ctx = canvas.getContext('2d');

                    this.graph.setData(ctx, canvas, this.props.engine);
                    this.graph.calculatePlotValues();
                    this.graph.clean();
                    this.graph.drawGraph();
                    this.graph.drawAxes();
                    this.graph.drawGameData();

                    this.animRequest = window.requestAnimationFrame(this.draw);
                }
            },

            render: function() {
                return D.canvas({
                    width: this.graph.canvasWidth,
                    height: this.graph.canvasHeight
                });
            }

        });

    }
)
