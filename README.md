## About

GRBLWeb is a web based GCODE sender and controller for GRBL.  Multiple serial devices can be connected to control multiple machines.

More information can be found at http://xyzbots.com

Copyright 2015 Andrew Hodel andrewhodel@gmail.com under the GNU AFFERO GENERAL PUBLIC LICENSE Version 3

You must share the source of your project and notify the original author via email in plain english if you include or use this code, even if it is included or used as a library on the web.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

If you would like to include this code in a project which is not licensed under the AGPL V3, please contact the author at andrewhodel@gmail.com

## additional credits
This repo is a mixture of the above repo, and work done by bryanchanrobot
https://github.com/wgbartley/grblweb
https://github.com/brychanrobot/grblweb

## Raspberry Pi prebuilt Image

There is a prebuilt Raspberry Pi Image that is fully configured.  More information and a link to the .img can be found at http://xyzbots.com

## GRBL v.8 vs v.9 and baud rate

GRBL .9 uses 115200 baud rate while previous versions use 9600, if you are using GRBL .9 change config.serialBaudRate to 115200 in config.js.

## GRBL Reading

https://github.com/grbl/grbl

https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.8

http://onehossshay.wordpress.com/2011/08/21/grbl-how-it-works-and-other-thoughts/

## Installation
node --version
v0.10.32
npm --version
1.4.28

I ran into errors with a base install of nodejs on ubuntu

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
## Camera
you'll presently need to install mjpg-streamer, working on something more integrated, but no promises
https://github.com/jacksonliam/mjpg-streamer

## Access

The default port in config.js is 8000, you can change it by editing the file.

http://hostaddress:8000/

## Enable /dev/ttyAMA0 on rPi

Read http://www.hobbytronics.co.uk/raspberry-pi-serial-port

Set config.usettyAMA0 to 1 in config.js

This is already enabled on the prebuilt GRBLWeb Raspbian image.

## Fixes
script is looking for mjpg port again
camera viewport readded to main screen
minjs stuff is included again (have to check to see if that's actually "ok" or if I need to point to downloads there as well)
USB serial port is available for selection

## dev setup
raspi V1 - raspi camera - linksprite 3 axis CNC 
http://linksprite.com/wiki/index.php5?title=DIY_CNC_3_Axis_Engraver_Machine_PCB_Milling_Wood_Carving_Router_Kit_Arduino_Grbl
