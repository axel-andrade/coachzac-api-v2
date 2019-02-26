'use strict';
const utils = require("./Utils.js");
const conf = require('config');
const Define = require('./Define.js');
const Mail = require('./mailTemplate.js');
const Messages = require('./Messages.js');
const listFields = ["name", "email", "dateOfBirth", "weight", "height", "adress", "phone", "profileImage", "level", "points", "countAnalyze", "badSteps", "mediumSteps", "goodSteps", "lastAnalyze", "favorited",];
const listRequiredFields = ["name", "email", "dateOfBirth", "genre", "weight", "height", "adress", "phone"];
let mapplayersSending = {};

function Player(request, response) {

    var _request = request;
    var _response = response;
    var _currentUser = request ? request.user : null;
    var _params = request ? request.params : null;

    var _super = {

        getPlayerById: function (id) {

            var query = new Parse.Query(Parse.User);
            return query.get(id, { useMasterKey: true });

        },

        afterDelete: function () {

            let data = _request.object.toJSON();
            let player = new Define.Player();
            player.id = data.objectId;

            let q1 = new Parse.Query("Analyze");
            q1.equalTo("player", player);
            q1.find().then(function (results) {
                Parse.Object.destroyAll(results);
            });

            let q2 = new Parse.Query("Training");
            q2.equalTo("player", player);
            q2.find().then(function (results) {
                Parse.Object.destroyAll(results);
            });

        },
        getObjectById: function (object, id) {

            var query = new Parse.Query(object);
            return query.get(id, { useMasterKey: true });

        },

        publicMethods: {

            createPlayer: function () {
                var requiredFields = utils.verifyRequiredFields(_params, ["name", "email", "dateOfBirth", "weight", "height", "adress", "phone"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }

                let promises = [];
                let _user;
                _params.email = _params.email.toLowerCase().trim();
                let query = new Parse.Query(Parse.User);
                query.limit(9999999);
                query.equalTo('username', _params.email);

                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(query.first({ useMasterKey: true })); // [1] get player

                return Parse.Promise.when(promises).then(function (results) {
                    let user = results[1];
                    if (!user) {
                        let user = new Parse.User();
                        user.set("name", _params.name);
                        user.set("email", _params.email);
                        user.set("username", _params.email)
                        user.set("dateOfBirth", _params.dateOfBirth);
                        user.set("weight", _params.weight);
                        user.set("height", _params.height);
                        user.set("adress", _params.adress);
                        user.set("phone", _params.phone);
                        user.set("genre", _params.genre)
                        user.set("profileImage", _params.profileImage);
                        user.set("level", 0);
                        user.set("coach", _currentUser);
                        user.set("favorited", false);
                        user.set("userGroup", "player");
                        let token = utils.randomString(25);
                        user.set("token", token);
                        user.set('password', _params.password ? _params.password : utils.makeRandomPass(5));
                        return user.signUp();

                    } else {
                        return Promise.reject(Messages.error.INVALID_EMAIL);
                    }

                }).then(function (user) {
                    _user = user;
                    let url = conf.linkPage + "/change_password/?token=" + user.get("token") + "&username=" + user.get("username");
                    return user.has("token") ? Mail.recoverPassword(user.get('name'), user.get("username"), url) : Parse.Promise.resolve();
                }).then(function () {
                    return _response.success({ objectId: _user.id });
                }, function (error) {
                    return _response.error(error)
                });

            },

            updatePlayer: function () {

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                let promises = [];
                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(_super.getPlayerById(_params.playerId)); //[1] get player

                return Parse.Promise.when(promises).then(function (results) {
                    if (_currentUser.id !== results[1].get("coach").id)
                        _response.error(Messages.error.ERROR_UNAUTHORIZED.code,Messages.error.ERROR_UNAUTHORIZED.message);
                    delete _params.playerId;
                    return results[1].save(_params, { useMasterKey: true });
                }).then(function (player) {
                    _response.success(player);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            deletePlayerProfileImage: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED.code,Messages.error.ERROR_UNAUTHORIZED.message);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);
                if (requiredFields.length > 0) {
                    _response.error(141,"Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                return _super.getPlayerById(_params.playerId).then(function (player) {
                    player.unset("profileImage");
                    return player.save(null, { useMasterKey: true });
                }).then(function (player) {
                    _response.success(player);
                }, function (error) {
                    _response.error(error.code, error.message);
                });;

            },
            getPlayers: function () {

                let promises = [];
                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(_super.getObjectById(Parse.User, _currentUser.id)); //[1] get _currentUser
                return Parse.Promise.when(promises).then(function (results) {
                    promises = [];

                    let query = new Parse.Query(Parse.User);
                    query.equalTo("coach", results[1]);
                    query.include("coach");

                    if (_params.search)
                        query = new Parse.Query.or(new Parse.Query(Parse.User).matches("name", _params.search, "i"), new Parse.Query(Parse.User).matches("email", _params.search, "i"));

                    if (_params.order)
                        _params.order[0] === "+" ? query.ascending(_params.order.substring(1)) : query.descending(_params.order.substring(1));

                    if (_params.favorited)
                        query.equalTo("favorited", _params.favorited);

                    let limit = _params.limit || 100;
                    let page = (_params.page || 0) * limit;
                    if (limit) query.limit(limit);
                    if (page) query.skip(page);

                    promises.push(query.count()); //[0] count players
                    promises.push(query.find()); //[1] players

                    return Parse.Promise.when(promises)
                }).then(function (results) {
                    let players = results[1];
                    let response = {};
                    response.total = results[0];
                    let data = [];
                    for (let i = 0; i < players.length; i++) {
                        data.push(players[i]);
                    }
                    response.players = data;
                    _response.success(response);
                }, function (error) {
                    _response.error(error.code,error.message);
                });
            },

            makeFavorite: function () {
                var requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required");
                    return;
                }
                let promises = [];
                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(_super.getPlayerById(_params.playerId));//[1] get player

                return Parse.Promise.when(promises).then(function (results) {
                    if (!results[1].get("favorited")) {
                        _response.error(141,"O atleta não pertence a lista de favoritos")
                    }
                    results[1].set("favorited",false);
                    return results[1].save({ useMasterKey: true })
                }).then(function () {
                    _response.success("Atleta adicionado na lista de atletas favoritos");
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },

            unmakeFavorite: function () {

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required");
                    return;
                }
                let promises = [];
                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(_super.getPlayerById(_params.playerId));//[1] get player

                return Parse.Promise.when(promises).then(function (results) {
                    //se o atleta já for favorito
                    if (results[1].get("favorited")) {
                        _response.error("O atleta já pertence a lista de favoritos")
                    }
                    results[1].set("favorited", true);
                    return results[1].save({ useMasterKey: true })
                }).then(function () {
                    _response.success("Atleta adicionado na lista de atletas favoritos");
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            
            },

        }
    };

    return _super;
}

exports.instance = Player;

/* CALLBACKS */
Parse.Cloud.beforeSave("Player", function (request, response) {
    Player(request, response).beforeSave();
});

Parse.Cloud.afterDelete("Player", function (request) {
    Player(request).afterDelete();
});

for (var key in Player().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        utils.printLogAPI(request)
        Player(request, response).publicMethods[request.functionName]();
    });
}



        // emailExists: async email =>{

        //     var Player = new Define.Player();
        //     var query = new Parse.Query(Player);
        //     var result = await query.find();

        //     if(result.length === 0)
        //         return false;
        //     else    
        //         return true;

        // },
