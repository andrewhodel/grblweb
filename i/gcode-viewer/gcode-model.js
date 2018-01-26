function createObjectFromGCode(gcode) {
    // GCode descriptions come from:
    //    http://reprap.org/wiki/G-code
    //    http://en.wikipedia.org/wiki/G-code
    //    SprintRun source code

    var lastLine = {
        x: 0,
        y: 0,
        z: 0,
        e: 0,
        f: 0,
	// set to true for cnc, no extruder
        extruding: true
    };

    var layers = [];
    var layer = undefined;
    var bbbox = {
        min: {
            x: 100000,
            y: 100000,
            z: 100000
        },
        max: {
            x: -100000,
            y: -100000,
            z: -100000
        }
    };

    function newLayer(line) {
        layer = {
            type: {},
            layer: layers.length,
            z: line.z,
        };
        layers.push(layer);
    }

    function getLineGroup(line) {
        if (layer == undefined)
            newLayer(line);
        var speed = Math.round(line.e / 1000);
        var grouptype = (line.extruding ? 10000 : 0) + speed;
        var color = new THREE.Color(line.extruding ? 0x33aadd : 0x228B22);
        if (layer.type[grouptype] == undefined) {
            layer.type[grouptype] = {
                type: grouptype,
                feed: line.e,
                extruding: line.extruding,
                color: color,
                segmentCount: 0,
                material: new THREE.LineBasicMaterial({
                    opacity: line.extruding ? 0.8 : 0.8,
                    transparent: true,
                    linewidth: 2,
                    vertexColors: THREE.FaceColors
                }),
                geometry: new THREE.Geometry(),
            }
        }
        return layer.type[grouptype];
    }

    function addSegment(p1, p2) {
        var group = getLineGroup(p2);
        var geometry = group.geometry;

        group.segmentCount++;
        geometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
        geometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));
        geometry.colors.push(group.color);
        geometry.colors.push(group.color);
        //if (p2.extruding) {
	// do this for all lines, not just extruding on cnc
            bbbox.min.x = Math.min(bbbox.min.x, p2.x);
            bbbox.min.y = Math.min(bbbox.min.y, p2.y);
            bbbox.min.z = Math.min(bbbox.min.z, p2.z);
            bbbox.max.x = Math.max(bbbox.max.x, p2.x);
            bbbox.max.y = Math.max(bbbox.max.y, p2.y);
            bbbox.max.z = Math.max(bbbox.max.z, p2.z);
        //}
    }
    var relative = false;

    function delta(v1, v2) {
        return relative ? v2 : v2 - v1;
    }

    function absolute(v1, v2) {
        return relative ? v1 + v2 : v2;
    }

    var parser = new GCodeParser({
        G1: function(args, line) {
            // Example: G1 Z1.0 F3000
            //          G1 X99.9948 Y80.0611 Z15.0 F1500.0 E981.64869
            //          G1 E104.25841 F1800.0
            // Go in a straight line from the current (X, Y) point
            // to the point (90.6, 13.8), extruding material as the move
            // happens from the current extruded length to a length of
            // 22.4 mm.

            var newLine = {
                x: args.x !== undefined ? absolute(lastLine.x, args.x) : lastLine.x,
                y: args.y !== undefined ? absolute(lastLine.y, args.y) : lastLine.y,
                z: args.z !== undefined ? absolute(lastLine.z, args.z) : lastLine.z,
                e: args.e !== undefined ? absolute(lastLine.e, args.e) : lastLine.e,
                f: args.f !== undefined ? absolute(lastLine.f, args.f) : lastLine.f,
            };

            //if (lastLine.x == 0 && lastLine.y == 0 && lastLine.z == 0) {
            // this is the first iteration
            // don't draw 
            //	lastLine = newLine;
            //}

            /* layer change detection is or made by watching Z, it's made by
               watching when we extrude at a new Z position */
            if (delta(lastLine.e, newLine.e) > 0) {
                newLine.extruding = delta(lastLine.e, newLine.e) > 0;
                if (layer == undefined || newLine.z != layer.z)
                    newLayer(newLine);
            }
            addSegment(lastLine, newLine);
            lastLine = newLine;
        },

	// FIXME
	// add g2/g3 controlled arcs
	G2: function(args, line) {
		console.log('G2 detected, unsupported to display but it will send it to the controller');
	},
	G3: function(args, line) {
		console.log('G3 detected, unsupported to display but it will send it to the controller');
	},

        G21: function(args) {
            // G21: Set Units to Millimeters
            // Example: G21
            // Units from now on are in millimeters. (This is the RepRap default.)

            // No-op: So long as G20 is not supported.
        },

        G90: function(args) {
            // G90: Set to Absolute Positioning
            // Example: G90
            // All coordinates from now on are absolute relative to the
            // origin of the machine. (This is the RepRap default.)

            relative = false;
        },

        G91: function(args) {
            // G91: Set to Relative Positioning
            // Example: G91
            // All coordinates from now on are relative to the last position.

            // TODO!
            relative = true;
        },

        G92: function(args) { // E0
            // G92: Set Position
            // Example: G92 E0
            // Allows programming of absolute zero point, by reseting the
            // current position to the values specified. This would set the
            // machine's X coordinate to 10, and the extrude coordinate to 90.
            // No physical motion will occur.

            // TODO: Only support E0
            var newLine = lastLine;
            newLine.x = args.x !== undefined ? args.x : newLine.x;
            newLine.y = args.y !== undefined ? args.y : newLine.y;
            newLine.z = args.z !== undefined ? args.z : newLine.z;
            newLine.e = args.e !== undefined ? args.e : newLine.e;
            lastLine = newLine;
        },

        M82: function(args) {
            // M82: Set E codes absolute (default)
            // Descriped in Sprintrun source code.

            // No-op, so long as M83 is not supported.
        },

        M84: function(args) {
            // M84: Stop idle hold
            // Example: M84
            // Stop the idle hold on all axis and extruder. In some cases the
            // idle hold causes annoying noises, which can be stopped by
            // disabling the hold. Be aware that by disabling idle hold during
            // printing, you will get quality issues. This is recommended only
            // in between or after printjobs.

            // No-op
        },

        'default': function(args, info) {
            //console.error('Unknown command:', args.cmd, args, info);
        },
    });

    parser.parse(gcode);

    //console.log("Layer Count ", layers.length);

    var object = new THREE.Object3D();

    for (var lid in layers) {
        var layer = layers[lid];
        //console.log("Layer ", layer);
        for (var tid in layer.type) {
            var type = layer.type[tid];
            //console.log("Layer ", layer.layer, " type ", type.type, " seg ", type.segmentCount);
            object.add(new THREE.Line(type.geometry, type.material));
        }
    }
    //console.log("bbox ", bbbox);

    // show dimensions in console
    var dX = bbbox.max.x-bbbox.min.x;
    var dY = bbbox.max.y-bbbox.min.y;
    var dZ = bbbox.max.z-bbbox.min.z;

    $('#console').append('\n<span style="color: red;">--------------New Gcode Loaded--------------</span>\n');
    $('#console').append('<span style="color: red;">Min Dimensions X: '+bbbox.min.x+' Y: '+bbbox.min.y+' Z: '+bbbox.min.z+'</span>\n');
    $('#console').append('<span style="color: red;">Max Dimensions X: '+bbbox.max.x+' Y: '+bbbox.max.y+' Z: '+bbbox.max.z+'</span>\n\n');
    $('#console').append('<span style="color: red;">Total Dimensions X: '+dX+' Y: '+dY+' Z: '+dZ+'</span>\n\n');
    $('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

    // take max X and Y and scale them to fit in #renderArea
    var scaleX = $('#renderArea').width()/dX;
    var scaleY = $('#renderArea').height()/dY;
    var scale = 1;

    if (scaleX < 1 && scaleY < 1) {
	// both less than 1, take smaller
	scale = scaleX;
	if (scaleY < scale) {
		scale = scaleY;
	}
    } else if (scaleX > 1 && scaleY > 1) {
	// both larger than 1, take larger
	scale = scaleX;
	if (scaleY > scale) {
		scale = scaleY;
	}
    } else {
	// zoom out
	scale = scaleX;
	if (scaleY < scale) {
		scale = scaleY;
	}
    }
    scale = scale/3;

    //console.log(scale, scaleX, scaleY);

    var center = new THREE.Vector3(
        bbbox.min.x + ((bbbox.max.x - bbbox.min.x) / 2),
        bbbox.min.y + ((bbbox.max.y - bbbox.min.y) / 2),
        bbbox.min.z + ((bbbox.max.z - bbbox.min.z) / 2));
    //console.log("center ", center);
    center = center.multiplyScalar(scale);

    // set position
    object.translateX(-center.x);
    object.translateY(-center.y);

    object.visible = true;

    object.scale.multiplyScalar(scale);

    return object;
}
