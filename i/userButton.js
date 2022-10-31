/*

    userButton.js - An addition to GRBLWeb
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

    ********
    
    1. Inculde files in index.html : <script src="userButton.js"></script>
                                     <link rel="stylesheet" href="userButton.css">
 
    2. Add 1 or more user defined button elements, set the id of the button to 
       btn-user-<n> where <n> is a consecutive number starting at 1 :
    
       <div class="btn-group btn-user" role="group">
        <button type="button" id="btn-user-1" class="btn btn-default btn-gcode" style="float: left; width: 150px;">User 1</button>
        <div class="btn-group" role="group">
         <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
          <span class="caret"></span>
         </button>
         <div class="dropdown-menu">
          <input type="text" class="form-control" name="title" placeholder="User 1">
          <textarea rows=4 placeholder="GCode"></textarea>
         </div>
        </div>
       </div>

    3. You may also add any simple button that executes GCode :
    
       <button type="button" class="btn btn-danger btn-gcode" style="margin: 10px;" data-gcodeline="$X">Unlock ($X)</button>
       
       If your GCode should have more than 1 line, use &#xa; to sepcify a new line :
       
       <button type="button" class="btn btn-danger btn-gcode" style="margin: 10px;" data-gcodeline="$X">Unlock ($X)</button>

*/


var socket;

function userButton(s) {
 
 socket = s;
 
 // Instruction from the server to configure the user buttons
 socket.on('configUserButtons', function(data) {
           
  // Loop over each user button on the page
  $('div.btn-user > button.btn-gcode').each(function() {
   var number = $(this).attr('id').substring(9);
   // Do we have data for this button?
   if(typeof data[number] != 'undefined') {
    $('#btn-user-'+number).html(data[number].title);
    $('#btn-user-'+number).data('gcodeline', data[number].line);
   }
  });
 });
}


$(document).ready(function() {

 // Make sure the dropdown form does not close when the form field is clicked.
 $('.dropdown-menu :input').click(function(e) {
  e.stopPropagation();
 });

 // Load the current details into the form when the uesr clicks the configure drop down
 $('.btn-user .dropdown-toggle').click(function() {
  var button = $(this).closest('.btn-user').find('> .btn');
  $(this).parent().find('.dropdown-menu input').val(button.html());
  $(this).parent().find('.dropdown-menu textarea').val(button.data('gcodeline'));
 });

 // Stop the axis step keys working in the form
 $('.dropdown-menu :input').keydown(function (e) {
  e.stopPropagation();
 });

                   
 // Pick up any changes to the title
 $('.dropdown-menu input').change(function(){
  var button = $(this).closest('.btn-user').find('> .btn');
  var number = button.attr('id').substring(9);
  button.html($(this).val());
  socket.emit('configUserButton', { 'button':number, 'title':button.html(), 'line': button.data('gcodeline')});
 });

 // Pick up any changes to the gcode
 $('.dropdown-menu textarea').change(function() {
  var button = $(this).closest('.btn-user').find('> .btn');
  var number = button.attr('id').substring(9);
  button.data('gcodeline', $(this).val());
  socket.emit('configUserButton', { 'button':number, 'title':button.html(), 'line': button.data('gcodeline')});
 });

 // If its a button with gcode data the send the code
 $('.btn-gcode').click(function() {
  var gcode = $(this).data('gcodeline');
  if(typeof gcode != 'undefined' && gcode != '') {
   socket.emit('gcodeLine', { line: gcode});
  }
 });
});
