# Natural Mongo

Grant and revoke users permissions on MongoDB using natural language.
We uses predefined roles to grant privileges on users. The roles can be applied either in the database scope and in the collection scope.
To identify the request characteristic (i.e. grant or revoke) we are using [IBM-Watson](http://www.ibm.com/watson/)'s [Natural-Language-Classifier](https://www.ibm.com/watson/developercloud/doc/nl-classifier/) service.

## Login
*IP*: Obligatory.

*Port*: Optional. Default: 27017.

*Admin username*: Optional. The username of the DB admin or the root user.

*Admin password*: Optional. The password of the DB admin or the root user.

*Admin DB*: The admin's database. If the admin is root, that db may be 'admin'. Default: admin.

**Notice**: Make sure to have the right permissions to perform grant/revoke operations on your database.

## Roles
* **read** - Can be applied on *databases* and *collections*.
* **readWrite** - Can be applied on *databases* and *collections*.
* **dbAdmin** - Can be applied on *databases* only.
* **dbOwner** - Can be applied on *databases* only.
* **userAdmin** - Can be applied on *databases* only.

## Roles actions
All actions are same as detailed in MongoDB documentation [Database-User-Roles](https://docs.mongodb.com/manual/reference/built-in-roles/#database-user-roles) and [Database-Administration-Roles](https://docs.mongodb.com/manual/reference/built-in-roles/#database-administration-roles).
## Usage
1. Enter the login details and connect by the "login" button.
2. Enter your request.
3. Click "send" and wait for approval.

## Examples:
* ...grant jhonny12 read permissions on db players...
* ...revoke jack dbAdmin role from db waiters...
* ...delete anna88 readWrite permission from db managers and collection tasks...

#### Licence: MIT
#### Authors: [Yahav Itzhak](https://github.com/yahavi) and [Valeriya Zelikovich](https://github.com/valeriyaz)