'use strict';
const utils = require("./Utils.js");
const conf = require('config');
const Define = require('./Define.js');
const Mail = require('./mailTemplate.js');
const Messages = require('./Messages.js');
const listFields = ["player", "coach", "date", "comment", "serveNumbers", "perfomed"];

function Training(request, response) {

    var _request = request;
    var _response = response;
    var _currentUser = request ? request.user : null;
    var _params = request ? request.params : null;

    var _super = {

        beforeSave: function () {
            console.log("BEFORE SAVE TRAINING");
            var object = _request.object;

            var wrongFields = utils.verify(object.toJSON(), listFields);
            if (wrongFields.length > 0) {
                _response.error("Field(s) '" + wrongFields + "' not supported.");
            }
            // //convertendo o objeto da requisicao para JSON
            // let data = object.toJSON();
            // var now = new Date();
            // let begin = new Date(data.begin.iso);
            // let end = new Date(data.end.iso);

            // //se a data de inicio do treino passada na requisição é inferior a atual
            // if (begin < now)
            //     _response.error("A data ou a hora são inferiores à (data/hora) atual!");

            // //verificando se hora de inicio maior que final 
            // if (begin > end && end.getHours() != 0) {
            //     _response.error("Horário de início maior que o horário de término");
            // }

            // _super.checkAvailability(begin,end);
            _response.success();
            
        },
        checkAvailability:  async(begin,end) => {

            //verificando se horarios ja existem
            let q1 = new Parse.Query("Training");
            let q2 = new Parse.Query("Training");
            q1.equalTo('begin',begin);
            q2.equalTo('end',end);         
            let q = new Parse.Query.or(q1,q2);
            let result = await q.count();
            console.log(result);
            if(result>0){
                return _response.error("Horário indisponível");
            }
            else {
                return response.success();
            }
        },

        getTrainingById: function (id) {
            var query = new Parse.Query("Training");
            return query.get(id, { useMasterKey: true });
        },


        trainingsPerfomedsOrNot: function (playerId, perfomed) {

            var query = new Parse.Query("Training");

            //para busca de treinos para determinado atleta
            if (playerId != null) {

                let player = new Define.Player();
                player.id = playerId;
                query.equalTo("player", player)
            }
            else
                console.log(playerId)

            query.equalTo("perfomed", perfomed || false);
            query.limit(100);

            return query.find();
        },

        makePerfomed: function (training, perfomed) {

            //se o objetivo e marcar como finalizado
            if (perfomed) {
                //se o atleta já for favorito
                if (training.get("perfomed")) {
                    return Promise.error("Treino já foi finalizado!");
                }
            }
            else {
                //se o atleta já for favorito
                if (!training.get("perfomed")) {
                    return Promise.error("Treino ainda não foi realizado!")
                }
            }

            training.set("perfomed", perfomed);

            return training.save();

        },

        calculateSpindle: function (data, offset) {

            var milisegundos_com_utc = data.getTime() + (data.getTimezoneOffset() * 60000);
            return new Date(milisegundos_com_utc + (3600000 * offset));

        },

        verifyLastDayOfMonth: function (date) {

            //separando a string da data na requisição [0] ano [1] mês [2] dia
            let splitDate = date.split("-");

            let day = Number(splitDate[2]);
            let month = Number(splitDate[1]);
            let year = Number(splitDate[0]);

            //pegando ultima data do mes que foi passado na requisicao
            let last = new Date(year, month, 0);

            //verificando se o dia passado pertence ao mes naquele e é valido
            if (day < 1 || day > last.getDate()) {
                return false;
            }

            return true;

        },

        publicMethods: {

            createTraining: function () {

                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED.code,Messages.error.ERROR_UNAUTHORIZED.message);
                    return;
                }

                //verificando campos 
                let requiredFields = utils.verifyRequiredFields(_params, ["playerId", "date"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }

                let query = new Parse.Query(Parse.User);
                return query.get(_params.playerId).then(function (player) {

                    if (!player.get("userGroup") || player.get("userGroup") !== "player" || _currentUser.id != player.get("coach").id)
                        return Promise.reject(Messages.error.ERROR_UNAUTHORIZED.code, Messages.error.ERROR_UNAUTHORIZED.message);
                    
                     //criando instancia do treino
                    let training = new Define.Training();
                    training.set("player", player);
                    training.set("coach", _currentUser);
                    training.set("date", typeof _params.date === "string" ? new Date(_params.date) : _params.date);
                    // training.set("end", end);
                    training.set("comment", _params.comment);
                    training.set("serveNumbers", _params.serveNumbers);
                    training.set("perfomed", false);

                    return training.save(null, {useMasterKey: true});

                }).then(function (training) {
                    _response.success(training);

                }, function (error) {
                    _response.error(error.code, error.message);
                });


            },

            editTraining: function () {

                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["trainingId", "playerId", "date", "hourBegin", "hourEnd"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                let _training;

                let begin = utils.createdDateWithoutTimeZone(_params.date, _params.hourBegin);
                let end = utils.createdDateWithoutTimeZone(_params.date, _params.hourEnd);

                return _super.getTrainingById(_params.trainingId).then(function (training) {
                    _training = training;
                    let query = new Parse.Query("Player");
                    return query.get(_params.playerId)

                }).then(function (player) {

                    //criando data da realização treino 
                    let date = new Date(_params.date + "T" + _params.hour);

                    _training.set("player", player);
                    _training.set("coach", _currentUser);
                    _training.set("begin", begin);
                    _training.set("end", end);
                    _training.set("comment", _params.comment);
                    _training.set("serveNumbers", _params.serveNumbers);
                    _training.set("perfomed", _params.status);

                    return _training.save()
                }).then(function (training) {
                    _response.success("Treino atualizado com sucesso!");
                }, function (error) {
                    _response.error(error.code, error.message);
                });

            },

            deleteTraining: function () {

                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["trainingId"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                //utilizando metódo privado (_super.getplayerById)
                return _super.getTrainingById(_params.trainingId).then(function (training) {
                    return training.destroy()
                }).then(function () {
                    _response.success("Treino deletado com sucesso!");
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },

            getTrainingById: function () {
                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["trainingId"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                return _super.getTrainingById(_params.trainingId)
                    .then(function (training) {
                        _response.success(utils.formatObjectToJson(training, ["player", "date", "comment", "serveNumbers", "status"]));
                    }, function (error) {
                        _response.error(error.code, error.message)
                    });
            },

            getTrainings: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED.code, Messages.error.ERROR_UNAUTHORIZED.message);
                    return;
                }
                
                let promises = [];
                var query = new Parse.Query(Define.Training);
                query.equalTo("coach", _currentUser);

                if (_params.order)
                 _params.order[0] === "+" ? query.ascending(_params.order.substring(1)) : query.descending(_params.order.substring(1));

                if (_params.perfomed == true || _params.perfomed == false)
                        query.equalTo("favorited", _params.perfomed);

                query.include("player");
                query.limit(10000);
                promises.push(query.count()); // [0] count trainings 
                promises.push(query.find());// [1] get trainings

                return Parse.Promise.all(promises).then(function (results) {

                        let response = {};
                        response.total = results[0];
                        let trainings = results[1];
                        var data = [];

                        for (var i = 0; i < trainings.length; i++) {
                            data.push(utils.formatObjectToJson(trainings[i], ["player", "date", "comment", "serveNumbers", "perfomed"]));
                        }

                        response.trainings = data;

                        _response.success(response);
                    }, function (error) {
                        _response.error(error.code, error.message)
                    });
            },

            getTrainingsByPlayer: function () {
                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                let requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                let query = new Parse.Query("Player");
                return query.get(_params.playerId)
                    .then(function (player) {

                        let query = new Parse.Query("Training");
                        query.equalTo("player", player);
                        return query.find()
                    }).then(function (result) {

                        var data = [];

                        for (var i = 0; i < result.length; i++) {
                            data.push(utils.formatObjectToJson(result[i], ["player", "date", "comment", "serveNumbers", "status"]));
                        }

                        _response.success(data);

                    }, function (error) {
                        _response.error(error.code, error.message);
                    });

            },

            getTrainingsPerfomed: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                //buscando treinos que ja foram realizados
                return _super.trainingsPerfomedsOrNot(null, true).then(function (result) {

                    //console.log(result);
                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["player", "date", "comment", "serveNumbers", "status"]));
                    }

                    _response.success(data);
                }, function (error) {
                    _response.error(error.code, error.message)
                });
            },

            getTrainingsNotPerfomed: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                //buscando treinos que ainda não foram realizados
                return _super.trainingsPerfomedsOrNot(null, false).then(function (result) {

                    //console.log(result);
                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["player", "date", "comment", "serveNumbers", "status"]));
                    }

                    _response.success(data);
                }, function (error) {
                    _response.error(error.code, error.message)
                });
            },

            getTrainingsPerfomedByPlayer: function () {
                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                return _super.trainingsPerfomedsOrNot(_params.playerId, true).then(function (result) {

                    //console.log(result);
                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["player", "date", "comment", "serveNumbers", "status"]));
                    }

                    _response.success(data);
                }, function (error) {
                    _response.error(error.code, error.message)
                });
            },

            getTrainingsNotPerfomedByPlayer: function () {

                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                return _super.trainingsPerfomedsOrNot(_params.playerId, false).then(function (result) {

                    //console.log(result);
                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["player", "date", "comment", "serveNumbers", "status"]));
                    }

                    _response.success(data);
                }, function (error) {
                    _response.error(error.code, error.message)
                });

            },

            makePerfomed: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["trainingId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required");
                    return;
                }

                return _super.getTrainingById(_params.trainingId).then(function (training) {
                    return _super.makePerfomed(training, true)

                }).then(function () {
                    _response.success("Treino finalizado!");
                }, function (error) {
                    _response.error(error.code, error.code);
                });


            },

            unmakePerfomed: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["trainingId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required");
                    return;
                }

                return _super.getTrainingById(_params.trainingId).then(function (training) {
                    return _super.makePerfomed(training, false)
                }).then(function () {
                    _response.success("Treino em aberto!");
                }, function (error) {
                    _response.error(error.code, error.code);
                });

            },
        }
    };

    return _super;

}

exports.instance = Training;

//Triggers
Parse.Cloud.beforeSave("Training", function (request, response) {
    Training(request, response).beforeSave();
});


for (var key in Training().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        utils.printLogAPI(request)
        Training(request, response).publicMethods[request.functionName]();
    });
}
