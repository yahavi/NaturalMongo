
var NaturalMongoDefs = ('./natural_mongo_defs');
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
// TODO - Upload to cloud
// TODO - HTTPS

// Frontend:
// TODO - Add more informative output. Arrange all in boxes? - Valeriya
// TODO - CSS - Valeriya
//
// ==========================================


// const MONGO_IP = '159.122.221.134';
// const MONGO_PORT = 27017;
const LOGIN_HTML_PATH = __dirname + '/public/login.html';
const MAIN_HTML_PATH = __dirname + "/public/natural_mongo.html";

var Login = NaturalMongoDefs.Login;

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    saveUninitialized: false,
    resave: false
}));

app.get('/', (req, res) =>{
    var session = req.session;
    if (session && session.login && session.dbList){
        sendHtml(MAIN_HTML_PATH, res);
    } else {
        sendHtml(LOGIN_HTML_PATH, res);
    }
});

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', () =>{
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});

app.post('/login', (req, res) =>{
    "use strict";
    var body = '';

    req.on('data', (data)=> {
        body += data;
    });

    req.on('end', ()=> {
        var login = JSON.parse(body);
        console.log(JSON.stringify(login));
        co(function *() {
            yield MongoUsersDriver.init(login, req.session);
        }).then(()=>{
            req.session.login = login;
            sendHtml(MAIN_HTML_PATH, res);
        }).catch((err)=> {
            console.log("Error caught! " + err);
            res.status(201).send("Error: " + err.message);
        })

    });
});

app.post('/ask', (req, res) =>{
    "use strict";
    var body = '';

    req.on('data', (data)=> {
        body += data;
    });

    req.on('end', ()=> {
        var status = 200;
        var singleRequest;
        var session = req.session;
        co(function *() {
            status = 200;
            singleRequest =
                MongoUsersDriver.identifyRequest(body, session.dbList);
            if (singleRequest.dbName && singleRequest.username){
                yield MongoUsersDriver.showRoles(session.login, singleRequest);
            }
            if (singleRequest.msg) {
                status = 201;
            }
        }).then(() =>{
            console.log("Calling then")
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
        }).catch((err)=> {
            console.log("Error caught! " + err);
            res.status(status).send("Error: " + err.message);
        })
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
        var session = req.session;
        co(function*() {
            switch (singleRequest.action) {
                case NLC.GRANT:
                    yield MongoUsersDriver.grantRole(session.login,
                                                     singleRequest);
                    break;
                case NLC.REVOKE:
                    yield MongoUsersDriver.revokeRole(session.login,
                                                      singleRequest);
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

app.get('/logout', (req, res)=>{
    "use strict";
    req.session.destroy(function(err) {
        if (err){
            console.error(err);
        }
    });
    sendHtml(LOGIN_HTML_PATH, res);
});



/**
 * Send a HTML to the client
 * @param fileName the html path
 * @param res the response object to the client
 */
var sendHtml = (fileName, res)=>{
    "use strict";
    res.sendFile(fileName, (err)=>{
        if (err){
            console.log(err);
            res.status(err.status).end();
            return false;
        }
    });
};

