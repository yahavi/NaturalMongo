
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://159.122.221.134:27017/';
var co = require('co');

const ROLES = ['read', 'readWrite', 'dbAdmin', 'dbOwner', 'userAdmin'];

const DB_NOT_FOUND = "Sorry, but i didn't understand your database name";
const USER_NOT_FOUND = "Sorry, but i didn't understand the username";
const ROLES_NOT_FOUND = "Sorry, but i didn't find any role";

var dbList = [];

module.exports = {

    init : (ip, port, cbk) => {
        "use strict";
        url = 'mongodb://' + ip + ":" + port + "/";
        var mongoSession;
        co(function*() {
            mongoSession = yield MongoClient.connect(url);
            console.log("Connected correctly to server");
            var adminDb = mongoSession.admin();

            // List all the available databases
            var dbs = yield adminDb.listDatabases();

            for (var dbDetails of yield dbs["databases"]){
                var currentDb = mongoSession.db(dbDetails["name"]);
                var collections = [];
                var users = [];
                var dbCollections = yield currentDb.listCollections().toArray();

                for (var collection of yield dbCollections){
                    collections.push(collection["name"]);
                }
                var usersDump = yield currentDb.command({ usersInfo: 1 });
                for (var user in usersDump["users"]){
                    users.push(usersDump["users"][user]["user"]);
                }
                dbList.push(new SingleDb(dbDetails["name"], collections, users));
            }

        }).then(()=>{
            console.log(dbList);
            mongoSession.close();
            cbk()
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
            cbk(err)
        });

    },

    showRoles : function *(singleRequest) {
        "use strict";
        var mongoSession;
        yield co(function*() {
            mongoSession = yield MongoClient.connect(url + singleRequest.dbName);
            var res = yield mongoSession.command({usersInfo:
                {user: singleRequest.username, db: singleRequest.dbName}});
            var users = res["users"];
            singleRequest.currentRoles = yield users[0]["roles"];
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
            throw err;
        });
    },

    grantRole : function *(singleRequest) {
        "use strict";
        var mongoSession;
        yield co(function*() {
            mongoSession = yield MongoClient.connect(url + singleRequest.dbName);
            yield mongoSession.command(
                {grantRolesToUser: singleRequest.username,
                 roles: singleRequest.roles});
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
            throw err;
        });
    },

    revokeRole : function *(singleRequest) {
        "use strict";
        var mongoSession;
        yield co(function*() {
            mongoSession = yield MongoClient.connect(url + singleRequest.dbName);
            yield mongoSession.command(
                {revokeRolesFromUser: singleRequest.username,
                 roles: singleRequest.roles});
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
            throw err;
        });
    },

    identifyRequest : (sentence) => {
        "use strict";
        var roles = [];
        var msg = "";
        sentence = sentence.toLowerCase();
        var splittedSentence = sentence.split(" ");

        for (var role in ROLES){
            var roleName = ROLES[role].toLowerCase();
            if (-1 < splittedSentence.indexOf(roleName)){
                roles.push(ROLES[role]); // Use the role as is
            }
        }
        if (0 == roles.length){
            msg = ROLES_NOT_FOUND;
        }
        for (var iDb in dbList){
            var currDb = dbList[iDb];
            var dbName = currDb["name"];
            if (-1 < splittedSentence.indexOf(dbName)){
                var username = "";
                // var collectionName = "";
                for (var iUser in currDb["users"]){
                    var currUser = currDb["users"][iUser];
                    if (-1 < splittedSentence.indexOf(currUser.toLowerCase())){
                        username = currUser;
                        break;
                    }
                }
                if (!username){
                    return new SingleRequest(USER_NOT_FOUND, dbName,
                                             undefined, roles);
                }
                // for (var iCollection in currDb["collections"]){
                //     var currCollection = currDb["collections"][iCollection];
                //     if (-1 < sentence.indexOf(currCollection)){
                //         collectionName = currCollection;
                //         break;
                //     }
                // }
                return new SingleRequest(msg, dbName, username, roles);
            }
        }
        return new SingleRequest(DB_NOT_FOUND);

    }
};

var SingleDb = function (name, collections, users){
    "use strict";
    this.name = name;
    this.collections = collections;
    this.users = users;
};

var SingleRequest = function (msg, dbName, username, roles){
    "use strict";
    this.msg = msg;
    this.dbName = dbName;
    this.username = username;
    this.roles = roles;
    this.action = "";
    this.currentRoles = "";
};