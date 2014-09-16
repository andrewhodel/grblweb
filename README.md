## About

GRBLweb is a web based GCODE sender and controller for GRBL.  Multiple serial devices can be connected to control multiple machines.

http://andrewhodel.github.io/grblweb/

Copyright 2014 Andrew Hodel andrewhodel@gmail.com under the GPL v2 license available in this directory.

## Raspberry Pi prebuilt Image

There is a prebuilt Rasbian image with GRBLweb already running on it at port 80 for 9600 baud GRBL devices.  More information and a link to the .img can be found at http://andrewhodel.github.io/grblweb/

The ethernet interface will get a DHCP address that you can ssh to.

username: pi
password: raspbian

## GRBL v.8 vs v.9 and baud rate

GRBL .9 uses 115200 baud rate while previous versions use 9600, if you are using GRBL .9 change config.serialBaudRate to 115200 in config.js.

## GRBL Reading

https://github.com/grbl/grbl

https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.8

http://onehossshay.wordpress.com/2011/08/21/grbl-how-it-works-and-other-thoughts/

## Installation

```
git clone https://github.com/andrewhodel/grblweb.git
cd grblweb
npm install
```

## Config

edit config.js to change serial baud rate and web port

## Running

// standalone
```
node server.js
```

// with forever
```
npm install -g forever
forever start server.js
```

## Access

The default port in config.js is 8000, you can change it by editing the file.

http://hostaddress:8000/

## Enable /dev/ttyAMA0 on rPi

Read http://www.hobbytronics.co.uk/raspberry-pi-serial-port

Set config.usettyAMA0 to 1 in config.js

This is already enabled on the prebuilt GRBLweb Raspbian image.
