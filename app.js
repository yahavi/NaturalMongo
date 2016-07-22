/*eslint-env node*/

var co = require('co');
var MongoUsersDriver = require('./mongo_users_driver');

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

var init = function(){
    MongoUsersDriver.init();

     MongoUsersDriver.grantRule("restaurants", "alpha", ["root"]);
    MongoUsersDriver.showRules("restaurants", "alpha");
};

init();



