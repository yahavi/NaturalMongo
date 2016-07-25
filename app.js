/*eslint-env node*/

var co = require('co');
var assert = require('assert');
var MongoUsersDriver = require('./mongo_users_mgr');

const MONGO_IP = '159.122.221.134';
const MONGO_PORT = 27017;
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

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);

    // ===============Temporary===============
    MongoUsersDriver.init(MONGO_IP, MONGO_PORT, function(err){
        "use strict";
        assert.equal(null, err);
        MongoUsersDriver.grantRole("restaurants", "restaurants", "alpha",
            ['read', 'readWrite', 'dbAdmin', 'dbOwner', 'userAdmin'],
            function(err){
            assert.equal(null, err);
            console.log("success");
        });
    });
    // =======================================
});

app.post('/sentence', function(req, res){
    "use strict";
    var body = '';

    req.on('data', (data)=>{
        body += data;
    });

    req.on('end', ()=>{
        var status = 200;
        console.log(body);
        var singleRequest = MongoUsersDriver.identifyRequest(body);
        if (singleRequest.msg){
            status = 201;
        }
        res.status(status).send(JSON.stringify(singleRequest));
    });
});



