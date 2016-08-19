
var MongoClient      = require('mongodb').MongoClient;
var assert           = require('assert');
var co               = require('co');
var NaturalMongoDefs = require('./natural_mongo_defs');

var SingleRequest = NaturalMongoDefs.SingleRequest;
var SingleDb      = NaturalMongoDefs.SingleDb;
var Role          = NaturalMongoDefs.Role;

const ROLES = ['read', 'readWrite', 'dbAdmin', 'dbOwner', 'userAdmin'];

const READ_ACTIONS = ['collStats', 'dbHash', 'dbStats', 'find', 'killCursors',
                      'listIndexes', 'listCollections'];
const READ_WRITE_ACTIONS = READ_ACTIONS + ['convertToCapped',
        'createCollection', 'dropCollection', 'createIndex', 'dropIndex',
        'emptycapped', 'insert', 'remove', 'renameCollectionSameDB', 'update'];


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
        console.log("login: " + JSON.stringify(login));
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
     * Roles types:
     * DB scope (Roles): read, readWrite, dbAdmin, dbOwner, userAdmin
     * Collection scope (Privileges): read, readWrite
     * Logic: If collection name was mentioned, grant only roles to the
     * specific collection, i.e the privileged. Otherwise, grant roles to
     * the database scope.
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
            var collectionName = singleRequest.collectionName;
            mongoSession = yield MongoClient.connect(url);
            mongoSession = mongoSession.db(dbName);
            var role = singleRequest.role;
            if (collectionName &&
                (role.role.role === "read" || role.role.role ==="readWrite")){
                yield createRole(mongoSession, role, dbName, collectionName);
            }
            yield mongoSession.command(
                {grantRolesToUser: singleRequest.username,
                 roles: [role]});
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            if (mongoSession) mongoSession.close();
            throw err;
        });
    },

    /**
     * Revoke a role from the requested user.
     * Roles types:
     * DB scope (Roles): read, readWrite, dbAdmin, dbOwner, userAdmin
     * Collection scope (Privileges): read, readWrite
     * Logic: If collection name was mentioned, revoke only roles of the
     * specific collection, i.e the privileged. Otherwise, revoke roles from
     * the database scope.
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
            var collectionName = singleRequest.collectionName;
            mongoSession = yield MongoClient.connect(url);
            mongoSession = mongoSession.db(dbName);
            var role = singleRequest.role;
            var roleName = role.role.role;
            var isCustomRole = collectionName &&
                (roleName === "read" || roleName ==="readWrite");
            if (isCustomRole) {
                var customRoleName = getRoleName(roleName, collectionName);
                var customRole = {role: customRoleName, db: dbName};
                var roleInfo = yield mongoSession.command({
                    rolesInfo: customRoleName
                });
                if (roleInfo.roles) {
                    yield mongoSession.command(
                        {
                            revokeRolesFromUser: singleRequest.username,
                            roles: [customRole]
                        });
                }
            }
            if (!isCustomRole || !collectionName){
                yield mongoSession.command(
                    {revokeRolesFromUser: singleRequest.username,
                                   roles: [singleRequest.role]});
            }
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
        var role;
        var msg = "";
        sentence = sentence.toLowerCase();
        var splitSentence = sentence.split(" ");
        for (var iDb in dbList){
            var currDb;
            if (dbList.hasOwnProperty(iDb)){
                currDb = dbList[iDb];
            }
            var dbName = currDb["name"];
            var indexOfDb = splitSentence.indexOf(dbName);
            if (-1 < indexOfDb){
                var username = "";
                var collectionName = "";

                // Handle cases of same db and collection names
                splitSentence.splice(indexOfDb, 1);

                for (var iRole in ROLES){
                    var roleName = ROLES[iRole].toLowerCase();
                    if (-1 < splitSentence.indexOf(roleName)){
                        role = new Role(ROLES[iRole], dbName);
                        break;
                    }
                }
                if (!role){
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
                    msg = USER_NOT_FOUND;
                }

                for (var iCollection in currDb["collections"]){
                    if (currDb["collections"].hasOwnProperty(iCollection)){
                        var currCollection = currDb["collections"][iCollection];
                        if (-1 < sentence.indexOf(currCollection)){
                            collectionName = currCollection;
                            break;
                        }
                    }
                }
                return new SingleRequest(msg, dbName, collectionName,
                                         username, role);
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
var getUrl = (login) => {
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
        var dbCollections =
            yield currentDb.listCollections(false /*filter*/).toArray();

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

/**
 * Create a custom role.
 * Assumptions:
 *   All parameters supplied and the base role is 'read' or 'readWrite'.
 * @param mongoSession the mongo session
 * @param role the role
 * @param dbName the db name
 * @param collectionName the collection name
 */
var createRole = function * (mongoSession, role, dbName, collectionName){
    var roleName = role.role;
    var actions = roleName == "read" ? READ_ACTIONS : READ_WRITE_ACTIONS;
    var customRoleName = getRoleName(roleName, collectionName);
    yield co(function*() {
        // Check whether the role exists
        var roleInfo = yield mongoSession.command({
            rolesInfo:  customRoleName
        });
        if (!roleInfo.roles){ // Role does not exists
            console.log("Creating role " + customRoleName);
            yield mongoSession.command(
                {createRole: customRoleName,
                 privileges: [{resource: {db: dbName, collection: collectionName},
                 actions: actions}],
                 roles: []});
        }

    }).catch((err)=>{
        console.error(err.stack);
        if (mongoSession) mongoSession.close();
        throw err;
    });
};

/**
 * Return role name
 * @param baseRoleName the role name (read, readWrite, dbAdmin, etc.)
 * @param collectionName the collection name
 * @returns {string} <baseRoleName>:<collectionName>
 */
var getRoleName = (baseRoleName, collectionName) => {
    "use strict";
    if (!baseRoleName){
        console.error("role is " + baseRoleName + "!");
    }
    console.log("The role name is: " + baseRoleName + ":" + collectionName);
    return baseRoleName + ":" + collectionName;
};