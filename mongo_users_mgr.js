
var MongoClient      = require('mongodb').MongoClient;
var assert           = require('assert');
var co               = require('co');
var NaturalMongoDefs = require('./natural_mongo_defs');

var SingleRequest = NaturalMongoDefs.SingleRequest;
var SingleDb      = NaturalMongoDefs.SingleDb;
var Role          = NaturalMongoDefs.Role;

const ROLES = ['read', 'readWrite', 'dbAdmin', 'dbOwner', 'userAdmin'];

const DB_NOT_FOUND    = "database name not found";
const USER_NOT_FOUND  = "username not found";
const ROLES_NOT_FOUND = "Please mention an appropriate role";

module.exports = {

    /**
     * Get the login details and initialize the dbList
     * @param login the login details
     * @param session the session to initialize with dbList
     */
    init : function *(login, session) {
        "use strict";
        var dbList = [];
        console.log("login: " + JSON.stringify(login))
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

    /**
     * Put the user roles in singleRequest
     * @param login the login details
     * @param singleRequest the request
     */
    showRoles : function *(login, singleRequest) {
        "use strict";
        var mongoSession;
        var url = getUrl(login);
        yield co(function*() {
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

    /**
     * Grant a role to the requested user
     * @param login the login details
     * @param singleRequest the request
     */
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

    /**
     * Revoke a role from the requested user
     * @param login the login details
     * @param singleRequest the request
     */
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

    /**
     * Synchronous function - Identify a request: Get a sentence and a dbList
     * and return a singleRequest object
     * @param sentence the sentence
     * @param dbList the dbList
     * @returns {module.exports.SingleRequest}
     */
    identifyRequest : (sentence, dbList) => {
        "use strict";
        var roles = [];
        var msg = "";
        sentence = sentence.toLowerCase();
        var splitSentence = sentence.split(" ");

        for (var iDb in dbList){
            var currDb;
            if (dbList.hasOwnProperty(iDb)){
                currDb = dbList[iDb];
            }
            var dbName = currDb["name"];
            if (-1 < splitSentence.indexOf(dbName)){
                var username = "";
                // var collectionName = "";
                for (var role in ROLES){
                    var roleName = ROLES[role].toLowerCase();
                    if (-1 < splitSentence.indexOf(roleName)){
                        roles.push(new Role(ROLES[role], dbName));
                    }
                }
                if (!roles){
                    msg = ROLES_NOT_FOUND;
                }

                for (var iUser in currDb["users"]){
                    var currUser;
                    if (currDb["users"].hasOwnProperty(iUser)){
                        currUser = currDb["users"][iUser];
                    }

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

/**
 * Create a URL path from the login
 * @param login - the login details
 * @returns {string}
 */
var getUrl = function(login){
    "use strict";
    var userAndPass = (login.username && login.password) ?
    login.username + ":" + login.password + "@" : "";
    return 'mongodb://' + userAndPass + login.ip + ":" +
                          login.port + "/" + login.dbName;
};

/**
 * Get a dbName and push a new SingleDb object to the dbList
 * @param mongoSession - the mongo session
 * @param dbName - the db name
 * @param dbList - the db list
 */
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
            if (usersDump["users"].hasOwnProperty(user)){
                users.push(usersDump["users"][user]["user"]);
            }
        }
        dbList.push(new SingleDb(dbName, collections, users));
    });
};