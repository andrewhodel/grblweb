function GCodeParser(handlers) {
    this.handlers = handlers || {};
}

GCodeParser.prototype.parseLine = function(text, info) {
    text = text.replace(/;.*$/, '').trim(); // Remove comments
    if (text) {
        var tokens = text.split(' ');
        if (tokens) {
            var cmd = tokens[0];
            var args = {
                'cmd': cmd
            };
            tokens.splice(1).forEach(function(token) {
		try {
                	var key = token[0].toLowerCase();
		} catch (err) {
			// if there's an error, it just means that toLowerCase cannot lowercase a space
			var key = token[0];
		}
                var value = parseFloat(token.substring(1));
                args[key] = value;
            });
            var handler = this.handlers[tokens[0]] || this.handlers['default'];
            if (handler) {
                return handler(args, info);
            }
        }
    }
};

GCodeParser.prototype.parse = function(gcode) {
    var lines = gcode.split('\n');
    for (var i = 0; i < lines.length; i++) {
        if (this.parseLine(lines[i], i) === false) {
            break;
        }
    }
};
