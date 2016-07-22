
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://159.122.221.134:27017/';
var co = require('co');

const RULES = ['read', 'readWrite', 'dbAdmin', 'dbOwner', 'userAdmin',
               'clusterAdmin', 'clusterManager', 'clusterMonitor', 'hostManager',
               'backup', 'restore', 'readAnyDatabase', 'readWriteAnyDatabase',
               'userAdminAnyDatabase', 'dbAdminAnyDatabase', 'root'];


var dbList = [];

module.exports = {

    init : () => {
        "use strict";
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
                var dbCollections = yield currentDb.listCollections().toArray();

                for (var collection of yield dbCollections){
                    collections.push(collection["name"]);
                }

                dbList.push(new SingleDb(dbDetails["name"], collections));

            }

        }).then(()=>{
            console.log(dbList);
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
        });

    },

    showRules : (db, user) => {
        "use strict";
        var mongoSession;
        co(function*() {
            mongoSession = yield MongoClient.connect(url + db);
            var res =
                yield mongoSession.command({usersInfo: {user: user, db: db}});
            var users = res["users"];
            var roles = users[0]["roles"];
            console.log(JSON.stringify(roles))
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
        });
    },

    grantRule : (db, user, roles) => {
        "use strict";
        var mongoSession;
        co(function*() {
            mongoSession = yield MongoClient.connect(url + db);
            yield mongoSession.command({grantRolesToUser: user, roles: roles});
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
        });
    },

    revokeRule : (db, user, roles) => {
        "use strict";
        var mongoSession;
        co(function*() {
            mongoSession = yield MongoClient.connect(url + db);
            yield mongoSession.command({revokeRolesFromUser: user, roles: roles});
        }).then(()=>{
            mongoSession.close();
        }).catch((err)=>{
            console.error(err.stack);
            mongoSession.close();
        });
    }
};

var SingleDb = function (name, collections){
    this.name = name;
    this.collections = collections;
};