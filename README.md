## about

GRBLweb is a web based GCODE sender and controller for GRBL.  Multiple serial devices can be connected to control multiple machines.

Copyright 2014 Andrew Hodel andrewhodel@gmail.com under the GPL v2 license available in this directory.

There is a prebuilt Rasbian January 2014 image with GRBLweb already running on it at port 80 for 9600 baud GRBL devices.

The ethernet interface will get a DHCP address that you can ssh to.

username: pi

password: password

## grbl reading

https://github.com/grbl/grbl

https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.8

http://onehossshay.wordpress.com/2011/08/21/grbl-how-it-works-and-other-thoughts/

## config

edit config.js to change serial baud rate and web port

## installation

```
npm install node-static serialport socket.io
npm install -g forever
```

## running

// standalone
```
cd grblweb
node server.js
```

// with forever
```
npm install -g forever
cd grblweb
forever start server.js
```

## access

access http://host/ on port 80
