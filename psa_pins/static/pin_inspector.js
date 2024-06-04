function PinInspector(tray) {
    var mouse_down_evt = null;
    var selected_pin = null;
    var connected_pins = new Set();
    var lines = new Set();
    var current_net = '-';
    var current_conn = '-';
    var current_pin = '-';
    var current_type = '-';

    var pin_class_colors = {
        "GND": "#444444",
        "NC": "#E8E8E8",
        "SPARE": "#FFFFFF",
        "+28V": "red",
        "-28V": "orange",
        "DATA": "#8090FF",
        "UNK": "#FF80D0",
        "BP": "#108010",
    }

    var io_types = {
        "NC": "N/C",
        "SPARE": "Spare",
        "IN": "Input",
        "OUT": "Output",
        "UNK": "Unknown",
        "BP": "Backplane",
        "CHASSIS": "Chassis",
    }

    var svg = null;
    try {
        svg = tray.contentDocument;
    } catch (e) {
        svg = tray.getSVGDocument();
    }

    svg.documentElement.addEventListener("mousedown", tray_mouse_down, false);
    svg.documentElement.addEventListener("mouseup", tray_mouse_up, false);

    fetch('pins/pin_classes')
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            for (var i = 0; i < result.pin_classes.length; i++)
            {
                try {
                    var pin_id = result.pin_classes[i].pin.replace("-", "_");
                    if (pin_id == "R1_1" || pin_id == "R1_2") continue;
                    var pin = svg.getElementById(pin_id);
                    pin.style["fill"] = pin_class_colors[result.pin_classes[i].pin_class];
                } catch (e) {
                    alert("Pin id: " + result.pin_classes[i].pin);
                }
            }
        });


    function tray_mouse_down(evt) {
        mouse_down_evt = evt;
    }

    function unselect_pin(pin)
    {
        var radius = pin.getAttribute("r");
        pin.setAttribute("r", radius/1.2);

        var stroke_width = parseFloat(pin.getAttribute("stroke-width"));
        pin.setAttribute("stroke-width", "0.442");
        pin.setAttribute("stroke", "#000000");

        selected_pin = null;
    }

    function select_pin(pin)
    {
        if (selected_pin != null)
        {
            unselect_pin(selected_pin);
        }

        var radius = pin.getAttribute("r");
        pin.setAttribute("r", radius*1.2);

        pin.setAttribute("stroke-width", "1");
        pin.setAttribute("stroke", "#3282A7");

        selected_pin = pin;

        var pin_num = pin.id.split("_");
        current_conn = pin_num[0];
        current_pin = pin_num[1];

        fetch('pins/pin/'+pin_num[0]+'-'+pin_num[1])
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                var net = result["name"];
                current_net = net;
                current_type = io_types[result['iotype']];

                populate_info();
                disconnect_pins();
                connect_pins(result["wires"]);
            });
    }

    function disconnect_pins() {
        var pin_layer = svg.getElementById("pins");
        for (let l of lines) {
            pin_layer.removeChild(l);
        }
        for (let c of connected_pins) {
            var radius = c.getAttribute("r");
            c.setAttribute("r", radius/1.2);
        }
        connected_pins.clear();
        lines.clear();
    }

    function connect_pins(wires) {
        var pin_layer = svg.getElementById("pins");
        var stroke_width = 0.75;

        for (var i = 0; i < wires.length; i++) {
            var pin1 = svg.getElementById(wires[i][0].replace('-','_'));
            var pin2 = svg.getElementById(wires[i][1].replace('-','_'));

            var conn_line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            conn_line.setAttribute("id", "line"+i);
            conn_line.setAttribute("x1", pin1.getAttribute("cx"));
            conn_line.setAttribute("y1", pin1.getAttribute("cy"));
            conn_line.setAttribute("x2", pin2.getAttribute("cx"));
            conn_line.setAttribute("y2", pin2.getAttribute("cy"));
            conn_line.setAttribute("stroke", "#000000");
            conn_line.setAttribute("stroke-width", stroke_width);
            pin_layer.append(conn_line);
            lines.add(conn_line);
            connected_pins.add(pin1);
            connected_pins.add(pin2);
        }

        for (let c of connected_pins)
        {
            pin_layer.removeChild(c);
            pin_layer.append(c);

            var radius = c.getAttribute("r");
            c.setAttribute("r", radius*1.2);
        }
    }

    function populate_info() {
        document.getElementById("conn_text").innerHTML = current_conn;
        document.getElementById("pin_text").innerHTML = current_pin;
        document.getElementById("io_text").innerHTML = current_type;
        document.getElementById("net_text").value = current_net;
    }

    function tray_mouse_up(evt) {
        var dx = Math.abs(mouse_down_evt.clientX  - evt.clientX);
        var dy = Math.abs(mouse_down_evt.clientY  - evt.clientY);

        if ((dx > 1) || (dy > 1)) {
            return;
        }

        pin = evt.target;
        if (pin.id.match(/[EJR]\d\d?_\w?\d\d?/)) {
            select_pin(pin);
        }
    }

    return {
        select_pin_by_id : function(pin_id) {
            select_pin(svg.getElementById(pin_id));
        },

        locate_net : function(net) {
            fetch('pins/net/'+net.toUpperCase())
                .then(function(response) {
                    return response.json();
                })
                .then(function(result) {
                    if (result["wires"].length > 0) {
                        let pin_id = result["wires"][0][0].replace("-","_");
                        select_pin(svg.getElementById(pin_id));
                    }
                    document.getElementById("net_text").value = current_net;
                });
        },

        update_info : function() {
            populate_info();
        }
    }
}
