
var watson           = require("watson-developer-cloud");
var NaturalMongoDefs = require('./natural_mongo_defs');

const NLC_USERNAME      = '3aa030a7-dbdd-4365-94a1-5d9833f9fcaa';
const NLC_PASSWORD      = '5Mg58pLjCN4S';
const NLC_VERSION       = 'v1';
const NLC_CLASSIFIER_ID = '33fffex86-nlc-2459';

var nlc = watson["natural_language_classifier"]({
    username: NLC_USERNAME,
    password: NLC_PASSWORD,
    version:  NLC_VERSION
});

module.exports = {

    dummyclassify : function (sentence, cbk) {
        "use strict";
        var action;
        if (-1 < sentence.indexOf(NaturalMongoDefs.REVOKE)){
            action = NaturalMongoDefs.REVOKE;
        } else {
            action = NaturalMongoDefs.GRANT;
        }

        cbk(null, action);
    },

    /**
     * Get a sentence and classify it to Grant or Revoke
     * according to Watson's Natural Language Classifier
     * @param sentence the sentence to classify
     * @param cbk the cbk to call when we done
     */
    classify : function (sentence, cbk) {
        nlc.classify({text: sentence, classifier_id: NLC_CLASSIFIER_ID},
            (err, response) => {
               "use strict";
                if (response){
                    var action = parseAction(response["top_class"]);
                }

                cbk(err, action);
            }
        );
    }
};

/**
 * Return an action
 * @param actionString the action to parse
 * @returns {*}
 */
var parseAction = function(actionString){
    "use strict";
    switch (actionString.toLowerCase()){
        case NaturalMongoDefs.GRANT:
            return NaturalMongoDefs.GRANT;
        case NaturalMongoDefs.REVOKE:
            return NaturalMongoDefs.REVOKE;
        default:
            return NaturalMongoDefs.NOT_AN_ACTION;
    }
};