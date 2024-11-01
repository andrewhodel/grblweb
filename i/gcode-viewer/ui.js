var scene = null;
var object = null;
var added = false;

$(function() {
    scene = createScene($('#renderArea'));
});

function createObject(gcode) {
    if (object) {
	three_dispose_object_3d(object);
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

three_dispose_of_all_children(object) {

	var object_count = 0;

	while (object.children.length > 0) {
		if (object.children[0].children === undefined || object.children[0].children.length === 0) {

			// dispose object
			// must be before removeFromParent() and removeFromParent() must be next in the main thread
			this.three_dispose_object_3d(object.children[0]);

			// remove object
			object.children[0].removeFromParent();

			object_count++;

		} else {

			// remove children
			object_count += this.three_dispose_of_all_children(object.children[0]);

			// dispose object
			// must be before removeFromParent() and removeFromParent() must be next in the main thread
			this.three_dispose_object_3d(object.children[0]);

			// remove object
			object.children[0].removeFromParent();

			object_count++;
		}
	}

	return object_count;

}

three_dispose_object_3d(object) {

	object.traverse(obj => {

		if (obj.material) {

			obj.material.dispose();

			if (obj.material.map) {
				obj.material.map.dispose();
			}
			if (obj.material.lightMap) {
				obj.material.lightMap.dispose();
			}
			if (obj.material.aoMap) {
				obj.material.aoMap.dispose();
			}
			if (obj.material.emissiveMap) {
				obj.material.emissiveMap.dispose();
			}
			if (obj.material.bumpMap) {
				obj.material.bumpMap.dispose();
			}
			if (obj.material.normalMap) {
				obj.material.normalMap.dispose();
			}
			if (obj.material.displacementMap) {
				obj.material.displacementMap.dispose();
			}
			if (obj.material.roughnessMap) {
				obj.material.roughnessMap.dispose();
			}
			if (obj.material.metalnessMap) {
				obj.material.metalnessMap.dispose();
			}
			if (obj.material.alphaMap) {
				obj.material.alphaMap.dispose();
			}
			if(obj.material.envMaps){
				obj.material.envMaps.dispose()
			}
			if(obj.material.envMap){
				obj.material.envMap.dispose()
			}
			if(obj.material.specularMap){
				obj.material.specularMap.dispose()
			}
			if(obj.material.gradientMap){
				obj.material.gradientMap.dispose()
			}

		}

		if (obj.geometry) {
			obj.geometry.dispose();
		}

		if (obj.texture) {
			obj.texture.dispose();
		}

		if (obj.bufferBeometry) {
			obj.bufferGeometry.dispose();
		}

	});

}
