
var watson = require("watson-developer-cloud");

const NLC_USERNAME = '3aa030a7-dbdd-4365-94a1-5d9833f9fcaa';
const NLC_PASSWORD = '5Mg58pLjCN4S';
const NLC_VERSION = 'v1';
const NLC_CLASSIFIER_ID = 'fd7edbx77-nlc-2211';

var nlc = watson.natural_language_classifier({
    username: NLC_USERNAME,
    password: NLC_PASSWORD,
    version:  NLC_VERSION
});

module.exports = {
    GRANT : "grant",
    REVOKE : "revoke",
    NOT_AN_ACTION : "not an action",

    // dummyClassify : function(sentence){
    //     "use strict";
    //     if (-1 < sentence.indexOf(this.REVOKE)){
    //         return this.REVOKE;
    //     }
    //     return this.GRANT;
    // },

    classify : function (sentence, cbk) {
        nlc.classify({text: sentence, classifier_id: NLC_CLASSIFIER_ID},
            (err, response) => {
               "use strict";
                var action = parseAction(response.top_class);
                cbk(err, action);
            }
        );
    }
};

var parseAction = function(actionString){
    "use strict";
    switch (actionString.toLowerCase()){
        case module.exports.GRANT:
            return module.exports.GRANT;
        case module.exports.REVOKE:
            return module.exports.REVOKE;
        default:
            return module.exports.NOT_AN_ACTION;
    }

};