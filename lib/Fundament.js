'use strict';
const utils = require("./Utils.js");
const conf = require('config');
const Define = require('./Define.js');
const Mail = require('./mailTemplate.js');
const Messages = require('./Messages.js');
const listFields = ["name","description","code","difficulty","video","image"];
const listRequiredFields = [];
let mapplayersSending = {};


function Fundament(request,response) {

    var _request = request;
    var _response = response;
    var _currentUser = request ? request.user : null;
    var _params = request ? request.params : null;

    var _super = {

        publicMethods: {

            getFundamentByCode: function(){

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


                let query = new Parse.Query("Fundament");
                query.equalTo("code",_params.code);
                return query.first().then(function(result){
                    _response.success(result);
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


                let query = new Parse.Query("Fundament");
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

            getFundaments: function(){
                if(!_currentUser){
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                let query = new Parse.Query("Fundament");
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

exports.instance = Fundament;


for (var key in Fundament().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        utils.printLogAPI(request)
        Fundament(request, response).publicMethods[request.functionName]();
    });
}
