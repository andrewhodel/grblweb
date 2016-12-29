/*
 TODO: Allow saving/loading of probing profiles
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

var reload = require('require-reload')(require);
//var config = reload('./config.js');
var config = require('./config');
var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor
var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs');
var static = require('node-static');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var qs = require('querystring');
var http = require('http');

// test for webcam
config.showWebCam = false;


// Monitor config.js for changes
/*
fs.watch('./config.js', function(e, f) {
	console.log('config.js changed, reloading');
	console.log('config: '+JSON.stringify(config));

	config = reload('./config.js');

	for(var i in io.sockets.connected)
		io.sockets.connected[i].emit('config', config);
});
*/


http.get('http://127.0.0.1:8080', function(res) {
	// valid response, enable webcam
	console.log('enabling webcam');
	config.showWebCam = true;
}).on('socket', function(socket) {
	// 2 second timeout on this socket
	socket.setTimeout(2000);
	socket.on('timeout', function() {
		this.abort();
	});
}).on('error', function(e) {
	console.log('Got error: '+e.message+' not enabling webcam')
});

app.listen(config.webPort);
var fileServer = new static.Server('./i');


function handler (req, res) {
	if (req.url.indexOf('/api/uploadGcode') == 0 && req.method == 'POST') {
		// this is a gcode upload, probably from jscut
		console.log('new data from jscut');
		var b = '';
		req.on('data', function (data) {
			b += data;
			if (b.length > 1e6) {
				req.connection.destroy();
			}
		});
		req.on('end', function() {
			var post = qs.parse(b);
			//console.log(post);
			io.sockets.emit('gcodeFromJscut', {'val':post.val});
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end(JSON.stringify({'data':'ok'}));
		});
	} else {
		fileServer.serve(req, res, function (err, result) {
			if (err) console.log('fileServer error: ', err, req.url);
		});
	}
}


function ConvChar( str ) {
  c = {'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#039;',
	   '#':'&#035;' };
  return str.replace( /[<&>'"#]/g, function(s) { return c[s]; } );
}


var sp = [];
var allPorts = [];
var piTemp = [];

function doSerialPortList() {
	serialport.list(function (err, ports) {
		// if on rPi - http://www.hobbytronics.co.uk/raspberry-pi-serial-port
		if (fs.existsSync('/dev/ttyAMA0') && config.usettyAMA0 == 1) {
			(ports = ports || []).push({comName:'/dev/ttyAMA0',manufacturer: undefined,pnpId: 'raspberryPi__GPIO'});
			console.log('adding /dev/ttyAMA0 because it is enabled in config.js, you may need to enable it in the os - http://www.hobbytronics.co.uk/raspberry-pi-serial-port');
		}

		allPorts = ports;

		for (var i=0; i<ports.length; i++) {
		!function outer(i){

			sp[i] = {};
			sp[i].port = ports[i].comName;
			sp[i].q = [];
			sp[i].qCurrentMax = 0;
			sp[i].lastSerialWrite = [];
			sp[i].lastSerialReadLine = '';
			// 1 means clear to send, 0 means waiting for response
			sp[i].handle = new SerialPort(ports[i].comName, {
				parser: serialport.parsers.readline("\n"),
				baudrate: config.serialBaudRate
			});
			sp[i].sockets = [];

			sp[i].handle.on("open", function() {
				console.log('connected to '+sp[i].port+' at '+config.serialBaudRate);

				// line from serial port
				sp[i].handle.on("data", function (data) {
					serialData(data, i);
				});

				// loop for status ?
				setInterval(function() {
					sp[i].handle.write('?', function(err) {
					});
				}, 1000);

			});

		}(i)
		}
	});
}

doSerialPortList();

if(config.enablePiTemperature) {
	getSensors();
}

function emitToPortSockets(port, evt, obj) {
	for (var i=0; i<sp[port].sockets.length; i++) {
		sp[port].sockets[i].emit(evt, obj);
	}
}


function emitToAllPortSockets(evt, obj) {
	for(var i=0; i<sp.length; i++)
		for(var j=0; j<sp[i].sockets.length; i++)
			sp[i].sockets[j].emit(evt, obj);
}


var unitsOfMeasurement = '';	// Try to keep track of inches vs millimeters


function serialData(data, port) {
	// handle ?
	if (data.indexOf('<') == 0) {
		// https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.8#---current-status

		// remove first <
		var t = data.substr(1);

		// remove last >
		t = t.substr(0,t.length-2);

		// split on , and :
		t = t.split(/,|:/);

		var machineData = {
			'status': t[0],
			'mpos': [t[2], t[3], t[4]],
			'wpos':[t[6], t[7], t[8]],
			'unitsOfMeasurement': unitsOfMeasurement
		};

		emitToPortSockets(port, 'machineStatus', machineData);

		return;
	}

	if (queuePause == 1) {
		// pause queue
		return;
	}

	data = ConvChar(data);

	if (data.indexOf('ok') == 0) {
		// ok is green
		emitToPortSockets(port, 'serialRead', {'line':'<span style="color: green;">RESP: '+data+'</span>'});

		// run another line from the q
		if (sp[port].q.length > 0) {
			// there are remaining lines in the q
			// write one
			sendFirstQ(port);
		}

		// remove first
		sp[port].lastSerialWrite.shift();

	} else if (data.indexOf('error') == 0) {
		// error is red
		emitToPortSockets(port, 'serialRead', {'line':'<span style="color: red;">RESP: '+data+'</span>'});

		// run another line from the q
		if (sp[port].q.length > 0) {
			// there are remaining lines in the q
			// write one
			sendFirstQ(port);
		}

		// remove first
		sp[port].lastSerialWrite.shift();

	} else {
		// other is grey
		emitToPortSockets(port, 'serialRead', {'line':'<span style="color: #888;">RESP: '+data+'</span>'});

		// This is where we're likely to see the units of measurement response
		// Inches
		if(data.indexOf(' G20 ')>=0)
			unitsOfMeasurement = 'in';

		if(data.indexOf(' G21 ')>=0)
			unitsOfMeasurement = 'mm';
	}

	if (sp[port].q.length == 0) {
		// reset max once queue is done
		sp[port].qCurrentMax = 0;
	}

	// update q status
	emitToPortSockets(port, 'qStatus', {'currentLength':sp[port].q.length, 'currentMax':sp[port].qCurrentMax});

	sp[port].lastSerialReadLine = data;

}


var currentSocketPort = {};


function sendFirstQ(port) {
	if (sp[port].q.length < 1) {
		// nothing to send
		return;
	}

	var t = sp[port].q.shift();

	// remove any comments after the command
	tt = t.split(';');
	t = tt[0];
	// trim it because we create the \n
	t = t.trim();
	if (t == '' || t.indexOf(';') == 0) {
		// this is a comment or blank line, go to next
		sendFirstQ(port);
		return;
	}

	// console.log('sending '+t+' ### '+sp[port].q.length+' current q length');

	// loop through all registered port clients
	for (var i=0; i<sp[port].sockets.length; i++) {
		sp[port].sockets[i].emit('serialRead', {'line':'<span style="color: black;">SEND: '+t+'</span>'+"\n"});
	}
	sp[port].handle.write(t+"\n")
	sp[port].lastSerialWrite.push(t);
}


var queuePause = 0;
io.sockets.on('connection', function (socket) {
	socket.emit('ports', allPorts);
	socket.emit('config', config);

	socket.on('refreshPorts', function(data) {
		doSerialPortList();

		setTimeout(function() {
			socket.emit('ports', allPorts);
		}, 1000);
	});

	// do soft reset, this has it's own clear and direct function call
	socket.on('doReset', function (data) {
		// soft reset for grbl, send ctrl-x ascii \030
		sp[currentSocketPort[socket.id]].handle.write("\030");
		// reset vars
		sp[currentSocketPort[socket.id]].q = [];
		sp[currentSocketPort[socket.id]].qCurrentMax = 0;
		sp[currentSocketPort[socket.id]].lastSerialWrite = [];
		sp[currentSocketPort[socket.id]].lastSerialRealLine = '';
	});

	// lines from web ui
	socket.on('gcodeLine', function (data) {
		if (typeof currentSocketPort[socket.id] != 'undefined') {
			// Append a $G if G20, G21, or $X is detected
			if(data.line.toUpperCase().indexOf("G20")>=0 || data.line.toUpperCase().indexOf("G21")>=0 || data.line.toUpperCase().indexOf("$X")>=0)
				data.line += "\n$G";

			// valid serial port selected, safe to send
			// split newlines
			var nl = data.line.split("\n");
			// add to queue
			sp[currentSocketPort[socket.id]].q = sp[currentSocketPort[socket.id]].q.concat(nl);
			// add to qCurrentMax
			sp[currentSocketPort[socket.id]].qCurrentMax += nl.length;
			if (sp[currentSocketPort[socket.id]].q.length == nl.length) {
				// there was no previous q so write a line
				sendFirstQ(currentSocketPort[socket.id]);
			}

		} else {
			socket.emit('serverError', 'you must select a serial port');
		}
	});

	socket.on('clearQ', function(data) {
		// clear the command queue
		sp[currentSocketPort[socket.id]].q = [];
		// update the status
		emitToPortSockets(currentSocketPort[socket.id], 'qStatus', {'currentLength':0, 'currentMax':0});
	});

	socket.on('pause', function(data) {
		// pause queue
		if (data == 1) {
			console.log('pausing queue');
			queuePause = 1;
		} else {
			console.log('unpausing queue');
			queuePause = 0;
			sendFirstQ(currentSocketPort[socket.id]);
		}
	});

	socket.on('disconnect', function() {
		if (typeof currentSocketPort[socket.id] != 'undefined') {
			for (var c=0; c<sp[currentSocketPort[socket.id]].sockets.length; c++) {
				if (sp[currentSocketPort[socket.id]].sockets[c].id == socket.id) {
					// remove old
					sp[currentSocketPort[socket.id]].sockets.splice(c,1);
				}
			}
		}
	});

	socket.on('usePort', function (data) {
		console.log('user wants to use port '+data);
		console.log('switching from '+currentSocketPort[socket.id]);

		if (typeof currentSocketPort[socket.id] != 'undefined') {
			for (var c=0; c<sp[currentSocketPort[socket.id]].sockets.length; c++) {
				if (sp[currentSocketPort[socket.id]].sockets[c].id == socket.id) {
					// remove old
					sp[currentSocketPort[socket.id]].sockets.splice(c,1);
				}
			}
		}

		if (typeof sp[data] != 'undefined') {
			currentSocketPort[socket.id] = data;
			sp[data].sockets.push(socket);

			// add to queue
			sp[currentSocketPort[socket.id]].q = sp[currentSocketPort[socket.id]].q.concat('$G');
			// add to qCurrentMax
			sp[currentSocketPort[socket.id]].qCurrentMax += 1;
			if (sp[currentSocketPort[socket.id]].q.length == 1) {
				// there was no previous q so write a line
				sendFirstQ(currentSocketPort[socket.id]);
			}
		} else {
			socket.emit('serverError', 'that serial port does not exist');
		}

	});

});


function getSensors() {
	for(var i in config.piTemperatureFile) {
		var data = fs.readFileSync(config.piTemperatureFile[i]).toString();

		// Most likely a DS18B20
		if(data.indexOf('crc')>=0 && data.indexOf('YES')>=0) {
			piTemp[i] = parseFloat(data.substr(data.indexOf('t=')+2).trim())/1000;

		// Maybe the internal temp
		} else
			piTemp[i] = parseFloat(data)/1000;
	}

	emitToAllPortSockets('sensors', piTemp);

	setTimeout(getSensors, 2000);
}
