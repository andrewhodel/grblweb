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

app.listen(config.webPort);
var fileServer = new static.Server('./i');

function handler (req, res) {

	//console.log(req.url);

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
			if (err) console.log('fileServer error: ',err);
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

serialport.list(function (err, ports) {

	// if on rPi - http://www.hobbytronics.co.uk/raspberry-pi-serial-port
	if (fs.existsSync('/dev/ttyAMA0') && config.usettyAMA0 == 1) {
		ports.push({comName:'/dev/ttyAMA0',manufacturer: undefined,pnpId: 'raspberryPi__GPIO'});
		console.log('adding /dev/ttyAMA0 because it exists, you may need to enable it - http://www.hobbytronics.co.uk/raspberry-pi-serial-port');
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
		sp[i].canQuestion = 1;
		sp[i].handle = new SerialPort(ports[i].comName, {
			parser: serialport.parsers.readline("\n"),
			baudrate: config.serialBaudRate
		});
		sp[i].sockets = [];
		// flag for first init
		sp[i].ready = 0;

		sp[i].handle.on("open", function() {

			console.log('connected to '+sp[i].port+' at '+config.serialBaudRate);

			// line from serial port
			sp[i].handle.on("data", function (data) {
				serialData(data, i);
			});

			// loop for status ?
			setInterval(function() {
				// if canQuestion is valid or it's a reset
				if (sp[i].canQuestion == 1 && sp[i].ready == 1) {
					// only write if we've got a response for the last one
					// console.log('writing ? to serial');
					sp[i].canQuestion = 0;
					sp[i].handle.write('?');
				}
			}, 200);

		});

	}(i)
	}

});

function emitToPortSockets(port, evt, obj) {
	for (var i=0; i<sp[port].sockets.length; i++) {
		sp[port].sockets[i].emit(evt, obj);
	}
}

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

		emitToPortSockets(port, 'machineStatus', {'status':t[0], 'mpos':[t[2], t[3], t[4]], 'wpos':[t[6], t[7], t[8]]});

		sp[port].canQuestion = 1;
		//console.log('canQuestion again, got valid ? response');

		// run another line from the q
		if (sp[port].q.length > 0) {
			// there are remaining lines in the q
			// write one
			//sendFirstQ(port);
		}

	} else if (data.indexOf('Grbl') == 0) {
		// this is a valid init
		sp[port].ready = 1;

	} else {

		data = ConvChar(data);

		if (data.indexOf('ok') == 0) {

			// ok is green
			emitToPortSockets(port, 'serialRead', {'line':'<span style="color: green;">'+data+'</span>'});

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
			emitToPortSockets(port, 'serialRead', {'line':'<span style="color: red;">'+data+'</span>'});

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
			emitToPortSockets(port, 'serialRead', {'line':'<span style="color: #888;">'+data+'</span>'});
		}

		if (sp[port].q.length == 0) {
			// reset max once queue is done
			sp[port].qCurrentMax = 0;
		}

		// update q status
		emitToPortSockets(port, 'qStatus', {'currentLength':sp[port].q.length, 'currentMax':sp[port].qCurrentMax});

	}

	sp[port].lastSerialReadLine = data;

}

var currentSocketPort = {};

function sendFirstQ(port) {
	var t = sp[port].q.shift();
	// loop through all registered port clients
	for (var i=0; i<sp[port].sockets.length; i++) {
		sp[port].sockets[i].emit('serialRead', {'line':'<span style="color: black;">'+t+'</span>'+"\n"});
	}
	sp[port].handle.write(t+"\n")
	sp[port].lastSerialWrite.push(t);
	sp[port].qCurrentMax = sp[port].q.length;
}

io.sockets.on('connection', function (socket) {

	socket.emit('ports', allPorts);

	// lines from web ui
	socket.on('gcodeLine', function (data) {

		if (typeof currentSocketPort[socket.id] != 'undefined') {
			// valid serial port selected, safe to send

			if (data.line == "\030") {

				// KILL for grbl
				sp[currentSocketPort[socket.id]].handle.write("\030");
				// reset vars
				sp[currentSocketPort[socket.id]].q = [];
				sp[currentSocketPort[socket.id]].qCurrentMax = 0;
				sp[currentSocketPort[socket.id]].lastSerialWrite = [];
				sp[currentSocketPort[socket.id]].lastSerialRealLine = '';

			} else {

				console.log('writing to serial: '+data.line);
				// split newlines
					var nl = data.line.split("\n");
				// add to queue
				sp[currentSocketPort[socket.id]].q = sp[currentSocketPort[socket.id]].q.concat(nl);
				if (sp[currentSocketPort[socket.id]].q.length == nl.length) {
					// there was no previous q so write a line
					sendFirstQ(currentSocketPort[socket.id]);
				}

			}

		} else {
			socket.emit('serverError', 'you must select a serial port');
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
		} else {
			socket.emit('serverError', 'that serial port does not exist');
		}
		
	});

});
