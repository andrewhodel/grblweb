/*

    GRBLWeb - a web based CNC controller for GRBL
    Copyright (C) 2021 Andrew Hodel

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
    MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

$(document).ready(function() {

	// init vars for better controls
	var isMouseDown = false;
	var tsLast = Date.now();

	// get dimensions for better controls
	var betterWidth = $('#betterControls').width();
	var betterHeight = $('#betterControls').height();
	var bPointWidth = $('#betterControlsPoint').width();
	var bPointHeight = $('#betterControlsPoint').height();

	// track the control mouse position externally
	var betterX = 0;
	var betterY = 0;

	// get the scale factor to reduce x and y to a resolution of -1 to 1
	var xSf = 2/betterWidth;
	var ySf = 2/betterHeight;

	// center the control point
	$('#betterControlsPoint').css('top', (betterHeight/2)-(bPointHeight/2) + 'px');
	$('#betterControlsPoint').css('left', (betterWidth/2)-(bPointWidth/2) + 'px');

	// on mousedown, set isMouseDown to true
        $('#betterControls').mousedown(function(event) {
		event.preventDefault();
		isMouseDown = true;
        });
        document.getElementById('betterControls').addEventListener('touchstart', function(event) {
		event.preventDefault();
		isMouseDown = true;
	}, false);

	// on mouseup reset center point
        $('#betterControls').mouseup(function(event) {
		event.preventDefault();
		isMouseDown = false;
		$('#betterControlsPoint').css('top', (betterHeight/2)-(bPointHeight/2) + 'px');
		$('#betterControlsPoint').css('left', (betterWidth/2)-(bPointWidth/2) + 'px');
	});
        document.getElementById('betterControls').addEventListener('touchend', function(event) {
		event.preventDefault();
		isMouseDown = false;
		$('#betterControlsPoint').css('top', (betterHeight/2)-(bPointHeight/2) + 'px');
		$('#betterControlsPoint').css('left', (betterWidth/2)-(bPointWidth/2) + 'px');
	});

	// loop for bettercontrol
	setInterval(function() {
		if (isMouseDown) {

			var gcX = betterX-(betterWidth/2);
			var gcY = betterY-(betterHeight/2);

			// add the scale factors
			gcX = xSf*gcX;
			gcY = ySf*gcY;

			// invert y axis because JS and CNC are opposite there
			if (gcY < 0) {
				gcY = Math.abs(gcY);
			} else if (gcY > 0) {
				gcY = -gcY;
			}

			// first get speed, calculated from the mean of abs(x) and abs(y)
			//var fSpeed = (Math.abs(gcX)+Math.abs(gcY))/2;

			// first get speed, calculated from the highest abs of x and y
			if (Math.abs(gcX) > Math.abs(gcY)) {
				var fSpeed = Math.abs(gcX)*$('#jogSpeed').val();
			} else {
				var fSpeed = Math.abs(gcY)*$('#jogSpeed').val();
			}

			fSpeed = Math.round(fSpeed*100)/100;

			// set final position movements based on #jogSize
			gcX = Math.round(gcX*$('#jogSize').val()*1000)/1000;
			gcY = Math.round(gcY*$('#jogSize').val()*1000)/1000;

			// gcode to send
			socket.emit('gcodeLine', { line: 'G91\nG0 F'+fSpeed+' X'+gcX+' Y'+gcY+'\nG90\n'});
		}
	}, 200);

	// on mousemove send gcode
        $('#betterControls').mousemove(function(event) {
		if (isMouseDown) {
				betterX = event.pageX-this.offsetLeft;
				betterY = event.pageY-this.offsetTop;

				// move point
				$('#betterControlsPoint').css('top',betterY-(bPointHeight/2) + 'px');
				$('#betterControlsPoint').css('left',betterX-(bPointWidth/2) + 'px');

		}
        });
        document.getElementById('betterControls').addEventListener('touchmove', function(event) {
		event.preventDefault();
		if (isMouseDown) {
				betterX = event.pageX-this.offsetLeft;
				betterY = event.pageY-this.offsetTop;

				// move point
				$('#betterControlsPoint').css('top',betterY-(bPointHeight/2) + 'px');
				$('#betterControlsPoint').css('left',betterX-(bPointWidth/2) + 'px');

		}
        });

	$( window ).resize(function() {
		// when header resizes, move ui down
		$('.table-layout').css('margin-top',$('.navbar-collapse').height()-34);
	});

	var socket = io.connect('');

	socket.on('serverError', function (data) {
		alert(data);
	});

	socket.on('gcodeFromJscut', function (data) {
		$('#command').val(data.val);
		openGCodeFromText();
		alert('new data from jscut');
	});

	// config from server
	socket.on('config', function (data) {
		if (data.showWebCam == true) {
			// show the webcam and link

			var webroot = window.location.protocol+'//'+window.location.hostname;
			//console.log(webroot);

			$('#wcImg').attr('src', webroot+':'+data.webcamPort+'/?action=stream');

			$('#wcLink').attr('href', webroot+':'+data.webcamPort+'/javascript_simple.html');

			$('#webcam').css('display','inline-block');
		}
	});

	socket.on('ports', function (data) {
		//console.log('ports event',data);
		$('#choosePort').html('<option val="no">Select a serial port</option>');
		for (var i=0; i<data.length; i++) {
			$('#choosePort').append('<option value="'+i+'">'+data[i].path+':'+data[i].pnpId+'</option>');
		}
		if (data.length == 1) {
			$('#choosePort').val('0');
			$('#choosePort').change();
		}
	});

	socket.on('qStatus', function (data) {
		$('#qStatus').html(data.currentLength+'/'+data.currentMax);
	});

	socket.on('machineStatus', function (data) {
		$('#mStatus').html(data.status);
		$('#mX').html('X: '+data.mpos[0]);
		$('#mY').html('Y: '+data.mpos[1]);
		$('#mZ').html('Z: '+data.mpos[2]);
		$('#wX').html('X: '+data.wpos[0]);
		$('#wY').html('Y: '+data.wpos[1]);
		$('#wZ').html('Z: '+data.wpos[2]);
		//console.log(data);
	});

	socket.on('serialRead', function (data) {
		if ($('#console p').length > 300) {
			// remove oldest if already at 300 lines
			$('#console p').first().remove();
		}
		$('#console').append('<p>'+data.line+'</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	$('#choosePort').on('change', function() {
		// select port
		socket.emit('usePort', $('#choosePort').val());
		$('#mStatus').html('Port Selected');
	})

	$('#sendReset').on('click', function() {
		socket.emit('doReset', 1);
	});

	$('#sendGrblHelp').on('click', function() {
		socket.emit('gcodeLine', { line: '$' });
	});

	$('#sendGrblSettings').on('click', function() {
		socket.emit('gcodeLine', { line: '$$' });
	});

	$('#pause').on('click', function() {
		if ($('#pause').html() == 'Pause') {
			// pause queue on server
			socket.emit('pause', 1);
			$('#pause').html('Unpause');
			$('#clearQ').removeClass('disabled');
		} else {
			socket.emit('pause', 0);
			$('#pause').html('Pause');
			$('#clearQ').addClass('disabled');
		}
	});

	$('#clearQ').on('click', function() {
		// if paused let user clear the command queue
		socket.emit('clearQ', 1);
		// must clear queue first, then unpause (click) because unpause does a sendFirstQ on server
		$('#pause').click();
	});

	$('#mpC').on('click', function() {
		$('#mpA').addClass('active');
		$('#wpA').removeClass('active');
		$('#mPosition').show();
		$('#wPosition').hide();
	});

	$('#wpC').on('click', function() {
		$('#wpA').addClass('active');
		$('#mpA').removeClass('active');
		$('#wPosition').show();
		$('#mPosition').hide();
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
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' X-'+$('#jogSize').val()+'\nG90'});
	});
	$('#xP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' X'+$('#jogSize').val()+'\nG90'});
	});
	$('#yP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Y'+$('#jogSize').val()+'\nG90'});
	});
	$('#yM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Y-'+$('#jogSize').val()+'\nG90'});
	});
	$('#zP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Z'+$('#jogSize').val()+'\nG90'});
	});
	$('#zM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Z-'+$('#jogSize').val()+'\nG90'});
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
				reader.onloadend = function (ev) {
					document.getElementById('command').value = this.result;
					openGCodeFromText();
				};
				reader.readAsText (ev.dataTransfer.files[0]);
			}  
		}

		document.getElementById('command').addEventListener ('dragenter', dragEvent, false);
		document.getElementById('command').addEventListener ('dragover', dragEvent, false);
		document.getElementById('command').addEventListener ('drop', dragEvent, false);

		// button
		var fileInput = document.getElementById('fileInput');
		fileInput.addEventListener('change', function(e) {
			reader.onloadend = function (ev) {
				document.getElementById('command').value = this.result;
				openGCodeFromText();
			};
			reader.readAsText (fileInput.files[0]);
		});

	} else {
		alert('your browser is too old to upload files, get the latest Chromium or Firefox');
	}

});
