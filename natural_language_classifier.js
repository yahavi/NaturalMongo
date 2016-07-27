

module.exports = {
    GRANT : 0,
    REVOKE : 1,

    classify : function(sentence){
        "use strict";
        if (-1 < sentence.indexOf("from")){
            return this.REVOKE;
        }
        return this.GRANT;
    }
};