/*

    userButtons.js - An addition to GRBLWeb
    Copyright (c) 2015, Ben Suffolk <ben@vanilla.net>

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

var fs = require('fs');

var userButtons = {};

if(fs.existsSync("./userButtons.json")) {
 userButtons = JSON.parse(fs.readFileSync("./userButtons.json"));
}

module.exports = function(io) {
 
 io.sockets.on('connection', function (socket) {
               
  socket.emit('configUserButtons', userButtons);

  socket.on('configUserButton', function(data) {
            
   var button = data['button'];
   if(typeof button != 'undefined' && button >0 && button <99) {
    console.log('new user button data for button: '+button);
    userButtons[button]  = data;
   }
 
   fs.writeFileSync("./userButtons.json", JSON.stringify(userButtons));
   socket.emit('configUserButtons', userButtons);
  });
 });
 
}

