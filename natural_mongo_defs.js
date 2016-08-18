
module.exports = {
    GRANT : "grant",
    REVOKE : "revoke",
    NOT_AN_ACTION : "not an action",
    /**
     * Login object
     * @param ip - Mongo server IP
     * @param port - Mongo server port
     * @param username - username of the admin
     * @param password - password of the admin
     * @param dbName - dbName of the admin
     * @constructor
     */
    Login : function(ip, port, username, password, dbName){
        "use strict";
        this.ip = ip.trim();
        this.port = port.trim();
        this.username = username.trim();
        this.password = password.trim();
        this.dbName = dbName.trim();
    },

    /**
     * SingleDb object
     * @param name - the name of the db
     * @param collections - collections of the db
     * @param users - users of the db
     * @constructor
     */
    SingleDb : function (name, collections, users){
        "use strict";
        this.name = name;
        this.collections = collections;
        this.users = users;
    },

    /**
     * SingleRequest object
     * @param msg - if defined, there was a problem in the request
     * @param dbName - dbName of the user that we want to change his/her roles
     * @param collectionName - the collection name
     * @param username - the username that we want to change his/her roles
     * @param role - the role to change
     * @param action - Grant/Revoke
     * @param currentRoles - the user current roles
     * @constructor
     */
    SingleRequest : function (msg, dbName, collectionName, username, role) {
        "use strict";
        this.msg = msg;
        this.dbName = dbName;
        this.collectionName = collectionName;
        this.username = username;
        this.role = role;
        this.action = "";
        this.currentRoles = "";
    },

    /**
     * Role object - Build a role in order to send
     * it to the Grant/Revoke functions
     * @param roleName - the role name
     * @param dbName - the db name
     * @constructor
     */
    Role : function (roleName, dbName){
        "use strict";
        this.role = roleName;
        this.db = dbName;
    }
};