$(document).ready(function() {

	var socket = io.connect('');

	socket.on('serverError', function (data) {
		alert(data);
	});

	socket.on('ports', function (data) {
		console.log('ports event',data);
		for (var i=0; i<data.length; i++) {
			$('#choosePort').append('<option value="'+i+'">'+data[i].comName+'</option>');
		}
	});

	socket.on('qStatus', function (data) {
		$('#qStatus').html('Command Queue: '+data.currentLength+'/'+data.currentMax);
	});

	socket.on('machineStatus', function (data) {
		$('#mStatus').html(data.status);
		$('#mX').html('mX: '+data.mpos[0]);
		$('#mY').html('mY: '+data.mpos[1]);
		$('#mZ').html('mZ: '+data.mpos[2]);
		$('#wX').html('wX: '+data.wpos[0]);
		$('#wY').html('wY: '+data.wpos[1]);
		$('#wZ').html('wZ: '+data.wpos[2]);
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

	$('#sendABS').on('click', function() {

		socket.emit('gcodeLine', { line: 'G90' });

	});

	$('#sendREL').on('click', function() {

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

	// WASD and up/down keys
	$(document).keydown(function (e) {
		var keyCode = e.keyCode || e.which;

		switch (keyCode) {
		case 65:
			// a key X-
			socket.emit('gcodeLine', { line: 'G0 X-1'});
			break;
		case 68:
			// d key X+
			socket.emit('gcodeLine', { line: 'G0 X1'});
			break;
		case 87:
			// w key Y+
			socket.emit('gcodeLine', { line: 'G0 Y1'});
			break;
		case 83:
			// s key Y-
			socket.emit('gcodeLine', { line: 'G0 Y-1'});
			break;
		case 38:
			// up arrow Z+
			socket.emit('gcodeLine', { line: 'G0 Z1'});
			break;
		case 40:
			// down arrow Z-
			socket.emit('gcodeLine', { line: 'G0 Z-1'});
			break;
		}
	});

});
