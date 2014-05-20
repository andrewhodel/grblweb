$(document).ready(function() {

	var socket = io.connect('');

	socket.on('serverError', function (data) {
		alert(data);
	});

	socket.on('ports', function (data) {
		//console.log('ports event',data);
		$('#choosePort').html('<option val="no">Select a serial port</option>');
		for (var i=0; i<data.length; i++) {
			$('#choosePort').append('<option value="'+i+'">'+data[i].comName+':'+data[i].pnpId+'</option>');
		}
	});

	socket.on('qStatus', function (data) {
		$('#qStatus').html('Command Queue: '+data.currentLength+'/'+data.currentMax);
	});

	socket.on('machineStatus', function (data) {
		$('#mStatus').html(data.status);
		$('#mX').html(data.mpos[0]);
		$('#mY').html(data.mpos[1]);
		$('#mZ').html(data.mpos[2]);
		$('#wX').html(data.wpos[0]);
		$('#wY').html(data.wpos[1]);
		$('#wZ').html(data.wpos[2]);
		//console.log(data);
	});

	socket.on('serialRead', function (data) {
		$('#console').append(data.line);
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	$('#choosePort').on('change', function() {
		// select port
		socket.emit('usePort', $('#choosePort').val());
	})

	$('#sendKill').on('click', function() {
		socket.emit('gcodeLine', { line: "\030"});
	});

	$('#sendGrblHelp').on('click', function() {
		socket.emit('gcodeLine', { line: '$' });
	});

	$('#sendGrblSettings').on('click', function() {
		socket.emit('gcodeLine', { line: '$$' });
	});

	$('#sendInch').on('click', function() {
		socket.emit('gcodeLine', { line: 'G20' });
	});

	$('#sendMm').on('click', function() {
		socket.emit('gcodeLine', { line: 'G21' });
	});

	$('#sendAbs').on('click', function() {
		socket.emit('gcodeLine', { line: 'G90' });
	});

	$('#sendRel').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91' });
	});

	$('#sendZero').on('click', function() {
		socket.emit('gcodeLine', { line: 'G92 X0 Y0 Z0' });
	});

	$('#sendCommand').on('click', function() {

		socket.emit('gcodeLine', { line: $('#command').val() });
		$('#command').val('');

	});

	// shift enter for send command
	$('#command').keydown(function (e) {
		if (e.shiftKey) {
			var keyCode = e.keyCode || e.which;
			if (keyCode == 13) {
				// we have shift + enter
				$('#sendCommand').click();
				// stop enter from creating a new line
				e.preventDefault();
			}
		}
	});

	$('#xM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G0 X-'+$('#stepSize').val()});
	});
	$('#xP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G0 X'+$('#stepSize').val()});
	});
	$('#yP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G0 Y'+$('#stepSize').val()});
	});
	$('#yM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G0 Y-'+$('#stepSize').val()});
	});
	$('#zP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G0 Z'+$('#stepSize').val()});
	});
	$('#zM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G0 Z-'+$('#stepSize').val()});
	});

	// WASD and up/down keys
	$(document).keydown(function (e) {
		var keyCode = e.keyCode || e.which;

		if ($('#command').is(':focus')) {
			// don't handle keycodes inside command window
			return;
		}

		switch (keyCode) {
		case 65:
			// a key X-
			e.preventDefault();
			$('#xM').click();
			break;
		case 68:
			// d key X+
			e.preventDefault();
			$('#xP').click();
			break;
		case 87:
			// w key Y+
			e.preventDefault();
			$('#yP').click();
			break;
		case 83:
			// s key Y-
			e.preventDefault();
			$('#yM').click();
			break;
		case 38:
			// up arrow Z+
			e.preventDefault();
			$('#zP').click();
			break;
		case 40:
			// down arrow Z-
			e.preventDefault();
			$('#zM').click();
			break;
		}
	});

	// handle gcode uploads
	if (window.FileReader) {

		var reader = new FileReader ();

		// drag and drop
		function dragEvent (ev) {
			ev.stopPropagation (); 
			ev.preventDefault ();
			if (ev.type == 'drop') {
				reader.onloadend = function (ev) { document.getElementById('command').value = this.result; };
				reader.readAsText (ev.dataTransfer.files[0]);
			}  
		}

		document.getElementById('command').addEventListener ('dragenter', dragEvent, false);
		document.getElementById('command').addEventListener ('dragover', dragEvent, false);
		document.getElementById('command').addEventListener ('drop', dragEvent, false);

		// button
		var fileInput = document.getElementById('fileInput');
		fileInput.addEventListener('change', function(e) {
			reader.onloadend = function (ev) { document.getElementById('command').value = this.result; };
			reader.readAsText (fileInput.files[0]);
		});

	} else {
		alert('your browser is too old to upload files, get the latest Chromium or Firefox');
	}

});
