/*
* Copyright (c) 2015 - 2016 Intel Corporation.
*
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
* LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
* OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
* WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

// The program is using the Node.js built-in `fs` module
// to load the config.json and any other files needed
var fs = require("fs");

// The program is using the Node.js built-in `path` module to find
// the file path to needed files on disk
var path = require("path");

// Load configuration data from `config.json` file. Edit this file
// to change to correct values for your configuration
var config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"))
);

// Initialize the hardware devices
var accelerometer = require("jsupm_mma7660");
var accel = new accelerometer.MMA7660(0, 76);


// The program is using the `superagent` module
// to make the remote calls to the data store
var request = require("superagent");

// Initialize the accelerometer to enable 64 samples per second
accel.setModeStandby();
accel.setSampleRate(1);
accel.setModeActive();

var screen = new (require("jsupm_i2clcd").Jhd1313m1)(0, 0x3E, 0x62);

// Display message on RGB LCD when program checking
// USGS earthquake data
function checking() {
  console.log("Checking...");
  screen.setCursor(0, 0);
  screen.setColor(0, 255, 0);
  screen.write("Checking...");
}

// Display message on RGB LCD when USGS indicated an
// earthquake occurred
function warn() {
  console.log("Earthquake!");
  screen.setCursor(0, 0);
  screen.setColor(255, 0, 0);
  screen.write("Earthquake!");
}

// Display message on RGB LCD when USGS indicated no
// earthquake occurred
function noquake() {
  console.log("No quake.");
  screen.setCursor(0, 0);
  screen.setColor(0, 255, 0);
  screen.write("No quake.");
}

// Clear RGB LCD after checking
function stop() {
  screen.setCursor(0, 0);
  screen.setColor(0, 0, 0);
  screen.write("                    ");
}

// Calls USGS to verify that an earthquake
// has actually occurred in the user's area
function verify() {
  console.log("coming into the verify function");
  checking();
  function callback(err, res) {
    if (err) { return console.error("err:", err); }

    // check if there were any quakes reported
    if (res.body.features.length) {
      warn();
    } else {
      noquake();
    }

    // turn off after 15 seconds
    setTimeout(stop, 15000);
  }

  // we'll check for quakes in the last ten minutes
  var time = new Date();
  time.setMinutes(time.getMinutes() - 10);

  request
    .get("http://earthquake.usgs.gov/fdsnws/event/1/query")
    .query({ format: "geojson" })
    .query({ starttime: time.toISOString() })
    .query({ latitude: config.LATITUDE })
    .query({ longitude: config.LONGITUDE })
    .query({ maxradiuskm: 500 })
    .end(callback);
}

// Main function checks every
// 100ms to see if there has been motion detected
// by the accelerometer. If so, it calls verify to
// check the USGS API and see if an earthquake has
// actually occurred, and displays info on the display
function main() {
  //console.log("Coming into the main function");
  var ax, ay, az;
  ax = accelerometer.new_floatp();
  ay = accelerometer.new_floatp();
  az = accelerometer.new_floatp();
  //console.log("fetching values from the accelerometer");

  var prev = false;

  setInterval(function() {
    //console.log("reading the acceleration value");
    accel.getAcceleration(ax, ay, az);
    //console.log("read the acceleration value ", accelerometer.floatp_value(ax), accelerometer.floatp_value(ay), accelerometer.floatp_value(az));
    var quake = accelerometer.floatp_value(ax) > 1;
    if (quake && !prev) { 
        verify(); }
    prev = quake;
  }, 100);
}

main();
