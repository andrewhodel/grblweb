var config = require('./config');
var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor
var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs');
var static = require('node-static');
var EventEmitter = require('events').EventEmitter;

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // reduce logging

app.listen(config.webPort);
var fileServer = new static.Server('./i');

function handler (req, res) {
	fileServer.serve(req, res, function (err, result) {
		if (err) console.log('fileServer error: ',err);
	});
}

function ConvChar( str ) {
  c = {'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#039;',
       '#':'&#035;' };
  return str.replace( /[<&>'"#]/g, function(s) { return c[s]; } );
}

var sp = [];
var allPorts = [];

serialport.list(function (err, ports) {

	allPorts = ports;

	for (var i=0; i<ports.length; i++) {
	!function outer(i){

		sp[i] = {};
		sp[i].port = ports[i].comName;
		sp[i].q = [];
		sp[i].qCurrentMax = 0;
		sp[i].lastSerialWrite = [];
		sp[i].lastSerialReadLine = '';
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
				// write ? always, to catch it
				sp[i].handle.write('?'+"\n");
			}, 400);

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
		// this is the first of 2 lines for a ? request

		// remove first <
		var t = data.substr(1);

		// remove last >
		t = t.substr(0,t.length-2);

		// split on , and :
		t = t.split(/,|:/);

		emitToPortSockets(port, 'machineStatus', {'status':t[0], 'mpos':[t[2], t[3], t[4]], 'wpos':[t[6], t[7], t[8]]});

	} else if (sp[port].lastSerialReadLine.indexOf('<') == 0 && data.indexOf('ok') == 0) {
		// this is the second of 2 lines for a ? request

		// run another line from the q
		if (sp[port].q.length > 0) {
			// there are remaining lines in the q
			// write one
			sendFirstQ(port);
		}

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
