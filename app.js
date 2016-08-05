
var co = require('co');
var assert = require('assert');
var MongoUsersDriver = require('./mongo_users_mgr');
var NLC = require('./natural_language_classifier');
var session = require('express-session');
var crypto = require('crypto');

// ================ TODOs ===================
// Backend:
// TODO - Add roles to a collection, e.g. privileges
// TODO - Train Watson better
// TODO? - Grant - Verify that the role not there
// TODO? - Revoke - Verify that the role is there
// TODO - HTTPS
// TODO - Beautify code

// Frontend:
// TODO - Connect user to DB with login and password
// TODO - Add more informative output. Arrange all in boxes - Valeriya
// TODO - CSS - Valeriya
//
// ==========================================


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

app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    saveUninitialized: false,
    resave: false
}));

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function () {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);

    // ===============Temporary===============
    MongoUsersDriver.init(MONGO_IP, MONGO_PORT, function (err) {
        "use strict";
        assert.equal(null, err);
    });
    // =======================================

    app.post('/ask', function (req, res) {
        "use strict";
        var body = '';

        req.on('data', (data)=> {
            body += data;
        });

        req.on('end', ()=> {
            var status = 200;
            var singleRequest;
            co(function *() {
                status = 200;
                singleRequest = MongoUsersDriver.identifyRequest(body);
                if (singleRequest.dbName && singleRequest.username){
                    yield MongoUsersDriver.showRoles(singleRequest);
                }
                if (singleRequest.msg) {
                    status = 201;
                }
            }).catch((err)=> {
                console.log("Error caught! " + err);
                res.status(status).send("Error: " + err.message);
            }).then(() =>{
                if (200 === status) {
                    NLC.classify(body, (err, response)=> {
                        if (err){
                            status = 201;
                            res.status(status).send("Error: " + err.message);
                        } else {
                            singleRequest.action = response;
                            res.status(status).json(singleRequest);
                        }
                    });
                } else {
                    res.status(status).json(singleRequest);
                }
            });
        });
    });

    app.post('/perform', (req, res)=> {
        "use strict";
        var body = '';

        req.on('data', (data)=> {
            body += data;
        });

        req.on('end', ()=> {
            var status = 200;
            var response = "Done";
            console.log(body);
            var singleRequest = JSON.parse(body);
            co(function*() {
                switch (singleRequest.action) {
                    case NLC.GRANT:
                        yield MongoUsersDriver.grantRole(singleRequest);
                        break;
                    case NLC.REVOKE:
                        yield MongoUsersDriver.revokeRole(singleRequest);
                        break;
                    default:
                        response = "Error! Unknown action";
                        status = 201;
                }
            }).then(()=> {
                res.status(status).send(response);
            }).catch((err)=> {
                res.status(status).send("Error: " + err.message);
            });
        });
    });
});





