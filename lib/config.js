/**
 * Created by Marina on 10/01/2018.
 */

'use strict';
var utils = require("./Utils.js");
var Messages = require('./Messages.js');
var Define = require('./Define');
var conf = require('config');
var Mail = require('./mailTemplate.js');
var listFields = ["indicationDiscount", "updatedAt", "workWithUs", "userTerms", "privacity", "use", "splitTaxi", "splitDelivery", "contactNumber", "authData", "createdAt", "objectId", "ACL", "_perishable_token"];
var listRequiredFields = [];

function Config(request, response) {
    var _request = request;
    var _response = response;
    var _currentUser = request ? request.user : null;
    var _params = request ? request.params : null;
    var _super = {
        beforeSave: function () {
            var object = _request.object;
            var wrongFields = utils.verify(object.toJSON(), listFields);
            if (wrongFields.length > 0) {
                _response.error("Field(s) '" + wrongFields + "' not supported.");
            }
            var requiredFields = utils.verifyRequiredFields(object.toJSON(), listRequiredFields);
            if (requiredFields.length > 0) {
                _response.error("Field(s) '" + requiredFields + "' are required.");
                return;
            }
            _response.success();
        },
        beforeDelete: function () {
            if (request.master) {
                _response.success();
            } else {
                _response.error(Messages.error.ERROR_UNAUTHORIZED);
            }
        },
        publicMethods: {
            setPermissionsMap: function(){
                if (utils.verifyAccessAuth(_currentUser, ["admin"], _response)) {
                    if (utils.verifyRequiredFields(_params, ["group", "permissions"], _response)) {

                    }
                }
            },
            createConfig: function () {
                //singleton
                if (utils.verifyAccessAuth(_currentUser, ["admin"], _response)) {
                    if (utils.verifyRequiredFields(_params, [], _response)) {
                        return utils.findObject(Define.Config, null, true).then(function (config) {
                            let conf;
                            if (!config) {
                                conf = new Define.Config();
                            } else conf = config;
                            return conf.save(_params);
                        }).then(function () {
                            _response.success(Messages.success.CREATED_SUCCESS);
                        }, function (error) {
                            _response.error(error);
                        })
                    }
                }
            },
            editConfig: function () {
                if (utils.verifyAccessAuth(_currentUser, ["admin"], _response)) {
                    if (utils.verifyRequiredFields(_params, [], _response)) {
                        return utils.findObject(Define.Config, null, true).then(function (config) {
                            return config.save(_params);
                        }).then(function () {
                            _response.success(Messages.success.EDITED_SUCCESS);
                        }, function (error) {
                            _response.error(error);
                        })
                    }
                }
            },
            getConfig: function () {
                if (utils.verifyAccessAuth(_currentUser, Define.userType, _response)) {
                    if (utils.verifyRequiredFields(_params, [], _response)) {
                        return utils.findObject(Define.Config, null, true).then(function (config) {
                            _response.success(utils.formatPFObjectInJson(config, ["userTerms", "copyrights", "splitTaxi", "splitDelivery", "contactNumber"]));
                        }, function (error) {
                            _response.error(error);
                        })
                    }
                }
            },
            getInitialData: function () {
                return utils.findObject(Define.Config, null, true).then(function (config) {
                    let output = {};
                    output.use = config && config.get('use') ? config.get('use') : conf.termosDeUso;
                    output.privacity = config && config.get('privacity') ? config.get('privacity') : conf.privacy;
                    output.copyrights = config && config.get('copyrights') ? config.get('copyrights') : "/";
                    output.workWithUs = config && config.get('workWithUs') ? config.get('copyrights') : conf.linkPage;

                    return _response.success(output);
                }, function (error) {
                    let output = {};
                    output.use =  conf.termosDeUso;
                    output.privacity =  conf.privacy;
                    output.copyrights =  "/";
                    output.workWithUs =  conf.linkPage;
                    return _response.success(output);
                });
            },
        }
    };
    return _super;
}

exports.instance = Config;

/* CALLBACKS */
Parse.Cloud.beforeSave("Config", function (request, response) {
    Config(request, response).beforeSave();
});
Parse.Cloud.beforeDelete("Config", function (request, response) {
    Config(request, response).beforeDelete();
});
for (var key in Config().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        Config(request, response).publicMethods[request.functionName]();
    });
}





