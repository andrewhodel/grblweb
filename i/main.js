/*
TODO: Auto-reconnect web sockets
TODO: "Click" the "Jog Control" tab when the config reloads (just in case)
*/

/*

    GRBLWeb - a web based CNC controller for GRBL
    Copyright (C) 2015 Andrew Hodel

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

var lastUnitsOfMeasurement = '';
var unitsBeforeProbe = '';
var config = {};

$(document).ready(function() {
	$( window ).resize(function() {
		// when header resizes, move ui down
		$('.table-layout').css('margin-top',$('.navbar-collapse').height()-34);
	});

	// Set up powertip and optional location
	$('[data-powertip]').each(function() {
		var opts = {};

		if($(this).data('powertippos')!=undefined)
			opts.placement = $(this).data('powertippos');

		$(this).powerTip(opts);
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
		console.log('config', data);
		config = data;

		if (data.showWebCam == true) {
			// show the webcam and link
			var webroot = window.location.protocol+'//'+window.location.hostname;

			$('#wcImg').attr('src', webroot+':'+data.webcamPort+'/?action=stream');
			$('#wcLink').attr('href', webroot+':'+data.webcamPort+'/javascript_simple.html');
			$('#webcam').css('display','inline-block');
		}

		// Hide the jsCut button if jsCut is "disabled"
		if(data.enableJsCut==0) {
			$('#jsCutButton').hide();
		}

		// Show controls tabs to "enable" probe controls
		if(data.enableProbeControls==1) {
			$('#controlTabs').show();
		}

		// Hide "better controls" and show simple controls
		if(data.enableSimpleControls==1) {
			$('#betterControlsWrapper').hide();
			$('#simpleControls').show();
			$('#probeControls').hide();
		}

		// Fill in jog default step increment
		if(data.jogControlDefaultIncr!=undefined)
			$('#jogSize').val(data.jogControlDefaultIncr).attr('placeholder', data.jogControlDefaultIncr);

		// Fill in jog default feed rate
		if(data.jogControlDefaultFeed!=undefined)
			$('#jogSpeed').val(data.jogControlDefaultFeed).attr('placeholder', data.jogControlDefaultFeed);

		// Fill in default X offset for probe
		if(data.probeControlXOffset!=undefined)
			$('#probeOffsetX').val(data.probeControlXOffset).attr('placeholder', data.probeControlXOffset);

		// Fill in default Y offset for probe
		if(data.probeControlYOffset!=undefined)
			$('#probeOffsetY').val(data.probeControlYOffset).attr('placeholder', data.probeControlYOffset);

		// Fill in default Z offset for probe
		if(data.probeControlZOffset!=undefined)
			$('#probeOffsetZ').val(data.probeControlZOffset).attr('placeholder', data.probeControlZOffset);

		// "Click" the "Jog Control" tab
		$('#controlTabLink').click().parent().click();
	});

	socket.on('ports', function (data) {
		$('#choosePort').html('<option val="no">Select a serial port</option>');
		for (var i=0; i<data.length; i++) {
			var selected = '';

			if(data[i].pnpId!=undefined && data[i].pnpId.toUpperCase().indexOf("ARDUINO_UNO")>=0)
				selected = 'selected="selected"';

			$('#choosePort').append('<option value="'+i+'" '+selected+'>'+data[i].comName+':'+data[i].pnpId+'</option>');
		}
		if (data.length == 1) {
			$('#choosePort').val('0');
			$('#choosePort').change();
		}

		$('#choosePort').change();
	});

	socket.on('qStatus', function (data) {
		$('#qStatus').html(data.currentLength+'/'+data.currentMax);

		var pct = Math.round((data.currentMax-data.currentLength)/data.currentMax*100);
		if(isNaN(pct))
			pct = 100;

		if(data.currentMax==0)
			pct = 0;

		$('#queueProgress').attr('aria-valuenow', pct).width(pct+'%').text(pct+'%');

		if(pct>0)
			$('#queueProgress').addClass('active');
		else
			$('#queueProgress').removeClass('active');
	});

	socket.on('machineStatus', function (data) {
		if(data.status.toUpperCase()=='ALARM') {
			data.status = '<span style="color:red; font-weight:bold;">'+data.status+'</span>';
		}

		// $('#console').append('<p>'+JSON.stringify(data)+'</p>');
		// data.status = '<span style="color:black; font-weight:bold;">'+data+'</span>';

		$('#mStatus').html(data.status);

		// Convert machine coordinates from mm to inches
		if(data.unitsOfMeasurement=='in') {
			for(var i in data) {
				if(i.indexOf("pos")>=0) {
					for(var j in data[i]) {
						data[i][j] = (Math.round(parseFloat(data[i][j]/25.4) * 10000)/10000);;
					}
				}
			}
		}

		$('#mX').html('X: '+data.mpos[0]);
		$('#mY').html('Y: '+data.mpos[1]);
		$('#mZ').html('Z: '+data.mpos[2]);
		$('#wX').html('X: '+data.wpos[0]);
		$('#wY').html('Y: '+data.wpos[1]);
		$('#wZ').html('Z: '+data.wpos[2]);

		// Only attempt to change things if the unit of measurement has changed
		if(data.unitsOfMeasurement!=lastUnitsOfMeasurement) {
			lastUnitsOfMeasurement = data.unitsOfMeasurement;

			$('.unitsOfMeasurementText').text(lastUnitsOfMeasurement);

			if(data.unitsOfMeasurement.toUpperCase()=='IN') {
				$('#setInches').addClass('btn-primary');
				$('#setMillimeters').removeClass('btn-primary');
			} else if(data.unitsOfMeasurement.toUpperCase()=='MM') {
				$('#setInches').removeClass('btn-primary');
				$('#setMillimeters').addClass('btn-primary');
			}
		}
	});


	socket.on('serialRead', function (data) {
		if ($('#console p').length > 300) {
			// remove oldest if already at 300 lines
			$('#console p').first().remove();
		}
		$('#console').append('<p>'+data.line+'</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});


	socket.on('sensors', function(data) {
		if(config.enablePiTemperature==1) {
			var tempHtml = '';

			for(var i in data) {
				if(config.piTemperatureFahrenheit==1) {
					tempHtml += Math.round(parseFloat(data[i]) * 9/5 + 32)+'&deg;F,&nbsp;';
				} else {
					tempHtml += (Math.round(parseFloat(data[i]) * 100)/100) +'&deg;C,&nbsp;';
				}
			}

			// Cut off the last ",&nbsp;"
			tempHtml = tempHtml.trim();
			tempHtml = tempHtml.substr(0, tempHtml.length-7);

			$('#mTemp').html(tempHtml);
		}
	})


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

	$('#probeTabLink').on('click', function() {
		$('#probeTab').addClass('active');
		$('#controlTab').removeClass('active');
		$('#probeControls').show();
		$('#simpleControls').hide();
	});

	$('#controlTabLink').on('click', function() {
		$('#controlTab').addClass('active');
		$('#probeTab').removeClass('active');
		$('#simpleControls').show();
		$('#probeControls').hide();
	});

	$('#probeHomeZero').on('click', function() {
		socket.emit('gcodeLine', { line: '$H' });
		socket.emit('gcodeLine', { line: 'G92 X0 Y0 Z0' });
	});

	$('#probeX').on('click', function() {
		var offsetX = parseFloat($('#probeOffsetX').val())+parseFloat($('#probeBitDiameter').val()/2);

		// Remember the units of measurement before we start the probe
		unitsBeforeProbe = lastUnitsOfMeasurement;

		socket.emit('gcodeLine', { line: 'G21' });							// Set to mm
		socket.emit('gcodeLine', { line: 'G38.2 X-50 F20' });				// Probe X
		socket.emit('gcodeLine', { line: 'G92 X'+(offsetX*-1) });			// Set X offset
		socket.emit('gcodeLine', { line: 'G1 X'+(offsetX+2)+' F1000' });	// Move probe 2mm away from offset

		// Restore the units of measurement after the probe
		if(unitsBeforeProbe=='in')
			socket.emit('gcodeLine', { line: 'G20' });
	});

	$('#probeY').on('click', function() {
		var offsetY = parseFloat($('#probeOffsetY').val())+parseFloat($('#probeBitDiameter').val()/2);

		// Remember the units of measurement before we start the probe
		unitsBeforeProbe = lastUnitsOfMeasurement;

		socket.emit('gcodeLine', { line: 'G21' });							// Set to mm
		socket.emit('gcodeLine', { line: 'G38.2 Y-50 F20' });				// Probe Y
		socket.emit('gcodeLine', { line: 'G92 Y'+(offsetY*-1) });				// Set Y offset
		socket.emit('gcodeLine', { line: 'G1 Y'+(offsetY+2)+' F1000' });	// Move probe 2mm away from offset

		// Restore the units of measurement after the probe
		if(unitsBeforeProbe=='in')
			socket.emit('gcodeLine', { line: 'G20' });
	});

	$('#probeZ').on('click', function() {
		var offsetZ = parseFloat($('#probeOffsetZ').val());

		// Remember the units of measurement before we start the probe
		unitsBeforeProbe = lastUnitsOfMeasurement;

		socket.emit('gcodeLine', { line: 'G21' });							// Set to mm
		socket.emit('gcodeLine', { line: 'G38.2 Z-75 F20'});				// Probe Z
		socket.emit('gcodeLine', { line: 'G92 Z'+offsetZ });				// Set Z offset
		socket.emit('gcodeLine', { line: 'G1 Z'+(offsetZ+5)+' F1000' });	// Move probe 5mm away from offset

		// Restore the units of measurement after the probe
		if(unitsBeforeProbe=='in')
			socket.emit('gcodeLine', { line: 'G20' });
	});

	$('#probeAll').on('click', function() {
		var offsetX = parseFloat($('#probeOffsetX').val())+parseFloat($('#probeBitDiameter').val()/2)+10;
		var offsetY = parseFloat($('#probeOffsetY').val())+parseFloat($('#probeBitDiameter').val()/2)+10;
		var offsetZ = parseFloat($('#probeOffsetZ').val())+10;

		$('#probeZ').click();	// Probe Z
		$('#probeX').click();	// Probe X
		$('#probeY').click();	// Probe Y

		// Remember the units of measurement before we start the probe
		unitsBeforeProbe = lastUnitsOfMeasurement;

		socket.emit('gcodeLine', { line: 'G21' });
		socket.emit('gcodeLine', { line: 'G1 X'+offsetX+' Y'+offsetY+' Z'+offsetZ+' F1000' });	// Move probe away from offset

		// Restore the units of measurement after the probe
		if(unitsBeforeProbe=='in')
			socket.emit('gcodeLine', { line: 'G20' });
	});

	$('#gotoZeroZeroZero').on('click', function() {
		socket.emit('gcodeLine', { line: 'G1 X0 Y0 Z0 F500' });
	});

	$('#sendZero').on('click', function() {
		socket.emit('gcodeLine', { line: 'G92 X0 Y0 Z0' });
	});

	$('#setInches').on('click', function() {
		socket.emit('gcodeLine', { line: 'G20' });
	});

	$('#setMillimeters').on('click', function() {
		socket.emit('gcodeLine', { line: 'G21' });
	});

	$('#sendHome').on('click', function() {
		socket.emit('gcodeLine', { line: '$H' });
	});

	$('#sendUnlock').on('click', function() {
		socket.emit('gcodeLine', { line: '$X' });
	});

	$('#sendCommand').on('click', function() {
		socket.emit('gcodeLine', { line: $('#command').val() });
		$('#command').val('');
	});

	$('#refreshPorts').on('click', function() {
		socket.emit('refreshPorts', {});
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
	// $(document).keydown(function (e) {
	// 	var keyCode = e.keyCode || e.which;
	//
	// 	if ($('#command').is(':focus')) {
	// 		// don't handle keycodes inside command window
	// 		return;
	// 	}
	//
	// 	switch (keyCode) {
	// 	case 65:
	// 		// a key X-
	// 		e.preventDefault();
	// 		$('#xM').click();
	// 		break;
	// 	case 68:
	// 		// d key X+
	// 		e.preventDefault();
	// 		$('#xP').click();
	// 		break;
	// 	case 87:
	// 		// w key Y+
	// 		e.preventDefault();
	// 		$('#yP').click();
	// 		break;
	// 	case 83:
	// 		// s key Y-
	// 		e.preventDefault();
	// 		$('#yM').click();
	// 		break;
	// 	case 38:
	// 		// up arrow Z+
	// 		e.preventDefault();
	// 		$('#zP').click();
	// 		break;
	// 	case 40:
	// 		// down arrow Z-
	// 		e.preventDefault();
	// 		$('#zM').click();
	// 		break;
	// 	}
	// });

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
