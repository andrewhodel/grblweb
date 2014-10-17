var scene = null;
var object = null;
var added = false;

$(function() {
    scene = createScene($('#renderArea'));
});

function createObject(gcode) {
    if (object) {
        scene.remove(object);
    }
    object = createObjectFromGCode(gcode);
    scene.add(object);
}

function openGCodeFromText() {
    var gcode = $('#command').val();
    if (document.hasFocus()) {
	createObject(gcode);
        //console.log('adding object with existing focus');
    } else {
        // wait for focus, then render
        //console.log('waiting for focus');
	$(window).bind('focus', function(event) {
	    createObject(gcode);
            //console.log('focus exists');
            // unbind for next object load
            $(this).unbind(event);
        });
    }
}
