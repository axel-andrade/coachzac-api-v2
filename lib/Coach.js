'use strict';
const utils = require("./Utils.js");
const conf = require('config');
const Define = require('./Define.js');
const Mail = require('./mailTemplate.js');
const Messages = require('./Messages.js');
const listFields = ["name", "email", "password", "phones", "description", "permissionsMap", "status", "licenses", "licensesCount", "profileImage"];
const listRequiredFields = ["name", "licenses", "email"];

function Coach(request, response) {
    var _request = request;
    var _response = response;
    var _currentUser = request ? request.user : null;
    var _params = request ? request.params : null;

    var _super = {
      
        getCoachById: function (id) {
            var query = new Parse.Query(Parse.User);
            return query.get(id, { useMasterKey: true });
        },
        publicMethods: {
            createCoach: function () {

                let requiredFields = utils.verifyRequiredFields(_params, ["name", "email", "password", "team", "dateOfBirth"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                }

                if (Define.coachPermissions.indexOf("createCoach") < 0) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                }

                let user = new Parse.User();
                _params.email = _params.email.toLowerCase().trim();
                user.set("isFacebook", false);
                user.set("profileImage", _params.profileImage);
                user.set("password", _params.password);
                user.set("username", _params.email);
                user.set("email", _params.email);
                user.set("name", _params.name);
                user.set("team", _params.team);
                user.set("dateOfBirth", _params.dateOfBirth);
                user.set('userGroup', "coach");

                return user.signUp(null).then(function (coach) {
                    _response.success(coach);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },

        },


    };
    return _super;
}

exports.instance = Coach;
/* CALLBACKS */

for (var key in Coach().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        Coach(request, response).publicMethods[request.functionName]();
    });
}