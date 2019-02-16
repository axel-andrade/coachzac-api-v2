/**
 * Created by Patrick on 22/06/2017.
 */
const utils = require("./Utils.js");
const Error = require('./Messages.js');
const mail = require('./mailTemplate.js');
var cont = 0;
function PushNotification(request, response) {
    const _request = request;
    const _response = response;
    var _currentUser = request ? request.user : null;
    var _params = request ? request.params : null;
    var _super = {
        beforeSaveInstallation: function () {
            _response.success();
        },
        sendPush: function (objectId, title, json, platform) {
            json = json || {};
            json.id = cont++;
            var userQuery = new Parse.Query(Parse.User);
            userQuery.equalTo("objectId", objectId);
            // var json = {id: cont++, type: type, objectId: scheduleId};
            var pushQuery = new Parse.Query(Parse.Installation);
            pushQuery.exists("user");
            pushQuery.include('user');
            pushQuery.matchesQuery("user", userQuery);
            if (platform) {
                pushQuery.equalTo("deviceType", platform);
            }
            return Parse.Push.send({
                "where": pushQuery,
                data: {
                    text: json,
                    alert: title,
                    sound: "default",
                    badge: "Increment"
                }, badge: "Increment"
            }, {useMasterKey: true});
        },

        publicMethods: {
            saveInstallationId: function () {
                if (!_currentUser && !_params.userId) {
                    _response.error(Error.error.ERROR_UNAUTHORIZED);
                    return;
                }
                let requiredFields = utils.verifyRequiredFields(_params, ["appIdentifier", "installationId", "deviceType", "deviceToken"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                _params.deviceType = _params.deviceType.toLowerCase().trim();
                let object = new Parse.Installation();
                object.set("appIdentifier", _params.appIdentifier);
                object.set("installationId", _params.installationId);
                object.set("deviceType", _params.deviceType);
                object.set("pushType", _params.deviceType);
                object.set("deviceToken", _params.deviceToken);
                if (_currentUser) object.set("user", _currentUser);
                if (_params.userId) {
                    let user = new Parse.User();
                    user.set("objectId", _params.userId);
                    object.set("user", user);
                }
                object.save(null, {useMasterKey: true}).then(
                    function (result) {
                        _response.success("ok");
                    }, function (error) {
                        _response.error(error);
                    }
                );
            },
            pushMessage: function () {
                var requiredFields = utils.verifyRequiredFields(_params, ["text", "alert", "objectId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                var userQuery = new Parse.Query(Parse.User);
                userQuery.equalTo("objectId", _params.objectId);
                _params.text.id = cont++;
                // pushQuery.containedIn("deviceType", ["ios", "android"]); // errors if no iOS certificate
                var pushQuery = new Parse.Query(Parse.Installation);
                pushQuery.exists("user");
                pushQuery.include('user');
                pushQuery.matchesQuery("user", userQuery);
                Parse.Push.send({
                    "where": pushQuery,
                    data: {
                        text: _params.text,
                        alert: _params.alert,
                        sound: "default",
                        badge: "Increment"
                    }, badge: "Increment"
                }, {useMasterKey: true}).then(function (res) {
                    console.log("pushMessage", res)
                    // Push was successful
                    _response.success('push successful')
                }, function (error) {
                    console.log("pushMessage", error)
                    // Handle error
                    _response.error('push failed')
                });
            },
            cleanBadge: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["installationId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                _params.installationId = _params.installationId.toLowerCase().trim();
                const query = new Parse.Query(Parse.Installation);
                query.equalTo("installationId", _params.installationId);
                query.equalTo("user", _currentUser);
                return query.first({useMasterKey: true}).then(function (inst) {
                    if (!inst) {
                        return Promise.resolve();
                    }
                    else {
                        inst.set("badge", 0);
                        return inst.save({useMasterKey: true});
                    }
                }).then(function () {
                    _response.success();
                }, function (error) {
                    _response.error(error.message);
                });
            },
            logout: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["installationId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                _params.installationId = _params.installationId.toLowerCase().trim();
                const query = new Parse.Query(Parse.Installation);
                query.equalTo("installationId", _params.installationId);
                query.equalTo("user", _currentUser);
                query.first({useMasterKey: true}).then(function (inst) {
                    if (!inst) {
                        return Promise.resolve();
                    }
                    return inst.destroy({useMasterKey: true})
                }).then(function () {
                    _response.success({});
                }, function (error) {
                    _response.error(error.message);
                });
            }
        }
    }
    return _super;
}
exports.instance = PushNotification;
Parse.Cloud.beforeSave(Parse.Installation, function (request, response) {
    PushNotification(request, response).beforeSaveInstallation();
});
for (var key in PushNotification().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        PushNotification(request, response).publicMethods[request.functionName]();
    });
}