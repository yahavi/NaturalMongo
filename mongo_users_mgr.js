
var NaturalMongoDefs = require('./natural_mongo_defs');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var co = require('co');

var SingleRequest = NaturalMongoDefs.SingleRequest;
var SingleDb = NaturalMongoDefs.SingleDb;

const ROLES = ['read', 'readWrite', 'dbAdmin', 'dbOwner', 'userAdmin'];

const DB_NOT_FOUND = "Please mention the database name";
const USER_NOT_FOUND = "Please mention the username";
const ROLES_NOT_FOUND = "Please mention a role";

module.exports = {

    init : function *(login, session) {
        "use strict";
        var dbList = [];

        var url = getUrl(login);
        var mongoSession;
        yield co(function*() {
            console.log("Connecting to " + url);
            mongoSession = yield MongoClient.connect(url);
            console.log("Connected correctly to server");
            var adminDb = mongoSession.admin();

            var dbs = yield adminDb.listDatabases();

            if (login.db){
                yield getSingleDb(mongoSession, login.db, dbList);
            } else {
                for (var dbDetails of yield dbs["databases"]){
                    yield getSingleDb(mongoSession, dbDetails["name"], dbList);
                }
            }

        }).then(()=>{
            console.log(dbList);
            session.dbList = dbList;
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            if (mongoSession){
                mongoSession.close();
            }
            throw err;
        });

    },

    showRoles : function *(login, singleRequest) {
        "use strict";
        var mongoSession;
        var url = getUrl(login);
        yield co(function*() {
            console.log("Connecting to " + url + singleRequest.dbName);
            mongoSession = yield MongoClient.connect(url);
            var res = yield mongoSession.command({usersInfo:
                {user: singleRequest.username, db: singleRequest.dbName}});
            var users = res["users"];
            singleRequest.currentRoles = yield users[0]["roles"];
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            if (mongoSession) mongoSession.close();
            throw err;
        });
    },

    grantRole : function *(login, singleRequest) {
        "use strict";
        var mongoSession;
        var url = getUrl(login);
        yield co(function*() {
            var dbName = singleRequest.dbName ?
                         singleRequest.dbName : login.dbName;
            mongoSession = yield MongoClient.connect(url);
            mongoSession = mongoSession.db(dbName);
            yield mongoSession.command(
                {grantRolesToUser: singleRequest.username,
                 roles: singleRequest.roles});
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            if (mongoSession) mongoSession.close();
            throw err;
        });
    },

    revokeRole : function *(login, singleRequest) {
        "use strict";
        var mongoSession;
        var url = getUrl(login);
        yield co(function*() {
            var dbName = singleRequest.dbName ?
                singleRequest.dbName : login.dbName;
            mongoSession = yield MongoClient.connect(url);
            mongoSession = mongoSession.db(dbName);
            yield mongoSession.command(
                {revokeRolesFromUser: singleRequest.username,
                 roles: singleRequest.roles});
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            if (mongoSession) mongoSession.close();
            throw err;
        });
    },

    identifyRequest : (sentence, dbList) => {
        "use strict";
        var roles = [];
        var msg = "";
        sentence = sentence.toLowerCase();
        var splitSentence = sentence.split(" ");

        for (var iDb in dbList){
            var currDb = dbList[iDb];
            var dbName = currDb["name"];
            if (-1 < splitSentence.indexOf(dbName)){
                var username = "";
                // var collectionName = "";
                for (var role in ROLES){
                    var roleName = ROLES[role].toLowerCase();
                    if (-1 < splitSentence.indexOf(roleName)){
                        roles.push(new Role(ROLES[role], dbName)); // Use the role as is
                    }
                }
                if (!roles){
                    msg = ROLES_NOT_FOUND;
                }

                for (var iUser in currDb["users"]){
                    var currUser = currDb["users"][iUser];
                    if (-1 < splitSentence.indexOf(currUser.toLowerCase())){
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

var getUrl = function(login){
    "use strict";
    var userAndPass = (login.username && login.password) ?
    login.username + ":" + login.password + "@" : "";
    return 'mongodb://' + userAndPass + login.ip + ":" + login.port + "/" + login.dbName;
};

var getSingleDb = function *(mongoSession, dbName, dbList){
    "use strict";
    yield co(function *() {
        var currentDb = mongoSession.db(dbName);
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
        dbList.push(new SingleDb(dbName, collections, users));
    });

};

var Role = function(roleName, dbName){
    "use strict";
    this.role = roleName;
    this.db = dbName;
};