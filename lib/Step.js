'use strict';
const utils = require("./Utils.js");
const conf = require('config');
const Define = require('./Define.js');
const Mail = require('./mailTemplate.js');
const Messages = require('./Messages.js');
const listFields = ["name", "description", "code", "difficulty", "video", "image", "coach", "fundament", "type", "isBlocked"];
const listRequiredFields = [];
let mapplayersSending = {};


function Step(request, response) {

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
        getObjectById: function (object, id) {
            let query = new Parse.Query(object);
            return query.get(id, { useMasterKey: true });
        },
        publicMethods: {
            createStep: function () {

                if (!_currentUser || !_currentUser.get("userGroup") || _currentUser.get("userGroup") !== "coach") {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                var requiredFields = utils.verifyRequiredFields(_params, ["name", "description", "code", "difficulty", "fundamentId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }

                return _super.getObjectById(Define.Fundament, _params.fundamentId).then(function (fundament) {
                     
                    delete _params.fundamentId;
                    _params.fundament = fundament;
                    _params.type = "default";
                    _params.isBlocked = false;
                    _params.coach = _currentUser;

                    let step = new Define.Step();
                    return step.save(_params, { useMasterKey: true });
                }).then(function (step) {
                    _response.success({objectId: step.id});
                }, function (error) {
                    _response.error(error.code, error.message);
                });

            },

            getStepByCode: function(){

                if(!_currentUser){
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                
                //verificando campos 
                var requiredFields = utils.verifyRequiredFields(_params, ["code"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }

                let query = new Parse.Query(Define.Step);
                query.equalTo("code",_params.code);
                return query.first().then(function(step){
                    _response.success(step);
                }, function(error){
                    _response.error(error.code,error.message);
                });
            },

            getFundamentsByCodes: function(){

                
                if(!_currentUser){
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                //verificando campos 
                var requiredFields = utils.verifyRequiredFields(_params, ["codes"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }

                let query = new Parse.Query(Define.Step);
                query.containedIn("code",_params.codes);
                return query.find().then(function(results){
                     let data = [];
                     for(let i=0; i<results.length;i++){
                         let temp = results[i].toJSON();
                         data.push({name: temp.name});
                     }
                     _response.success(data);
                }, function(error){
                    _response.error(error.code,error.message);
                });

            },

            getSteps: function(){
                if(!_currentUser){
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                let query = new Parse.Query(Define.Step);
                return query.find().then(function(result){
                    _response.success(result);
                }, function(error){
                    _response.error(error.code,error.message);
                });
            },

        }
    };

    return _super;
}

exports.instance = Step;


for (var key in Step().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        utils.printLogAPI(request)
        Step(request, response).publicMethods[request.functionName]();
    });
}
