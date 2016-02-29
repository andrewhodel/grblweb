// !!! All values that are distance measures should be entered in millimeters !!!

var config = {};

// Port to listen on for web site
config.webPort = 8000;

// Serial baud rate to Arduino
config.serialBaudRate = 115200;

// Use /dev/ttyAMA0
config.usettyAMA0 = 1;

// Enable simple jog controls
config.enableSimpleControls = 1;

// Enable probe controls
config.enableProbeControls = 1;

// Enable jsCut
config.enableJsCut = 0;

// Default step increment for jogging
config.jogControlDefaultIncr = 0.1;

// Default feed rate for jogging
config.jogControlDefaultFeed = 1000;

// X offset for probe
config.probeControlXOffset = -0.5;

// Y offset for probe
config.probeControlYOffset = -1.5;

// Z offset for probe
config.probeControlZOffset = 3.1;

// Auto-read temperature
config.enablePiTemperature = 1;
config.piTemperatureFahrenheit = 1;
config.piTemperatureFile = [
    '/sys/class/thermal/thermal_zone0/temp',
    '/sys/bus/w1/devices/28-000002aa87dd/w1_slave'
];

// TO DO:
// - Add probe diameters
// - Allow configuration of gcode for probing buttons

// expects a webcam stream from mjpg_streamer
//config.webcamPort = 8080;

module.exports = config;
