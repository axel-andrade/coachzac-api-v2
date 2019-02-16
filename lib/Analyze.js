'use strict';
const utils = require("./Utils.js");
const conf = require('config');
const Define = require('./Define.js');
const Mail = require('./mailTemplate.js');
const Messages = require('./Messages.js');
const listFields = ["playerId", "commentText", "commentAudio", "points", "player", "coach", "fundament", "createdAt", "updatedAt", "objectId", "average"];

function Analyze(request, response) {

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
            _response.success();

        },
        afterSave: function () {

            console.log("ENTROUUUUUUUUUUUUUUUUUU");

            return _super.recalculatePlayer(_request.object).then(function () {
                _response.success();
            }, function (error) {
                _response.error(error.code, error.message);
            });


            //_response.success();

        },
        afterDelete: function () {

            return _super.recalculatePlayer(_request.object).then(function () {
                _response.success();
            }, function (error) {
                _response.error(error.code, error.message);
            });

        },
        recalculatePlayer: function (object) {

            //let analyze = _request.object.toJSON();
            let analyze = object;
            let player = analyze.get("player");
            console.log("Player", player);

            //procurandos avaliações desse player
            let query = new Parse.Query(Define.Analyze);
            query.equalTo("player", player);
            query.descending("createdAt");

            let promises = [];
            let points = [];
            let newPoints = {};
            let namePoints = {};
            let bad = [];
            let medium = [];
            let good = [];
            let lastAnalyze = "";
            let _count;
            let sum = 0;

            return query.find().then(function (results) {

                _count = results.length;

                //se o jogador so possuia a avaliaçao que foi deletada, reiniciar seus pontos 
                if (results.length == 0) {

                    player.set("level", 0);
                    player.unset("points");
                    player.unset("badSteps");
                    player.unset("mediumSteps");
                    player.unset("goodSteps");
                    player.set("countAnalyze", 0);
                    player.unset("lastAnalyze");

                    return Promise.resolve([]);

                }
                else {
                    console.log(results.length);

                    //recuperando os pontos 
                    for (let i = 0; i < results.length; i++) {
                        let data = results[i].toJSON();
                        //pegando ultima data de avaliação para atualizar o resultado
                        if (i == 0)
                            lastAnalyze = data.createdAt;
                        // console.log(data);
                        points.push(data.points);
                    }

                    for (let i = 0; i < points.length; i++) {
                        promises.push(_super.calculateLevelPlayer(points[i]));
                        let data = points[i];
                        for (var key in data) {
                            if (!newPoints[key]) {
                                newPoints[key] = data[key];
                            }
                            else {
                                let value;
                                value = (newPoints[key] + data[key]) / 2;
                                newPoints[key] = value;
                            }
                        }
                    }

                    return Parse.Promise.when(promises)
                }
            }).then(function (resultArrayOfPromises) {
                console.log("PRIMEIRA PROMISE", resultArrayOfPromises.length);
                promises = [];

                if (resultArrayOfPromises.length > 0) {

                    console.log("Tem array");

                    for (let i = 0; i < resultArrayOfPromises.length; i++) {
                        sum += resultArrayOfPromises[i];
                    }
                    console.log("SUM", sum);

                    console.log("TEMP", newPoints);

                    for (let key in newPoints) {
                        promises.push(_super.getNameByCode(key));
                    }
                    return Parse.Promise.when(promises)
                }
                else
                    return Promise.resolve([]);

            }).then(function (names) {

                if (names.length > 0) {

                    let i = 0;
                    for (let key in newPoints) {

                        if (newPoints[key] >= 7)
                            good.push(names[i]);
                        if (newPoints[key] < 5)
                            bad.push(names[i]);
                        if (newPoints[key] >= 5 && newPoints[key] < 7)
                            medium.push(names[i]);

                        namePoints[names[i]] = newPoints[key];
                        i++;
                    }


                    let level = sum / _count;
                    console.log("LEVEL", level);
                    player.set("level", level);
                    player.set("points", namePoints);
                    player.set("badSteps", bad);
                    player.set("mediumSteps", medium);
                    player.set("goodSteps", good);
                    player.set("lastAnalyze", lastAnalyze);
                    player.set("countAnalyze", _count);
                }
                return player.save(null, { useMasterKey: true });
            }).then(function () {
                _response.success();
            }, function (error) {
                _response.error(error.code, error.message);
            });

        },
        calculateStatisticPlayer: function (results) {

            console.log(results);

            let points = [];
            let newPoints = {};
            let bad = [];
            let medium = [];
            let good = [];
            let lastAnalyze = "";
            let _temp;


            //recuperando os pontos 
            for (let i = 0; i < results.length; i++) {

                let data = results[i].toJSON();
                //pegando ultima data de avaliação para atualizar o resultado
                if (i == 0)
                    lastAnalyze = data.createdAt;
                //console.log(data);
                points.push(data.points);
            }

            console.log(points);

            let promises = [];
            for (let i = 0; i < points.length; i++) {
                promises.push(_super.calculateLevelPlayer(points[i]));
                let data = points[i];
                for (var key in data) {
                    if (!newPoints[key]) {
                        newPoints[key] = data[key];
                    }
                    else {
                        let value;
                        value = (newPoints[key] + data[key]) / 2;
                        newPoints[key] = value;
                    }
                }
            }

            console.log(newPoints);

            return Parse.Promise.when(promises).then(function (resultArrayOfPromises) {
                let sum = 0;
                for (let i = 0; i < resultArrayOfPromises.length; i++) {
                    sum += resultArrayOfPromises[i];
                }
                console.log("SUM", sum);

                console.log("TEMP", newPoints);

                //identificando os bons, médios e ruins fundamentos
                for (let key in newPoints) {
                    if (newPoints[key] >= 7)
                        good.push(key);
                    if (newPoints[key] < 5)
                        bad.push(key);
                    if (newPoints[key] >= 5 && newPoints[key] < 7)
                        medium.push(key);
                }

                let level = sum / results.length;

                _temp = {
                    level: level,
                    points: newPoints,
                    badSteps: bad,
                    mediumSteps: medium,
                    goodSteps: good,
                    countAnalyze: results.length,
                    lastAnalyze: lastAnalyze
                }

                return Promise.resolve();
            }).then(function () {
                _response.success(_temp);
            }, function (error) {
                _response.error(error.code, error.message);
            });

        },
        calculateLevelPlayer: function (p) {

            let data = [];

            for (let i in p)
                data.push(i);

            let sum = 0, div = 0;
            let query = new Parse.Query(Define.Step);
            //procurando o step de código
            query.containedIn("code", data);
            query.select(["difficulty", "code"]);
            return query.find().then(function (steps) {
                //value * difficulty
                for (let i = 0; i < steps.length; i++) {
                    sum += p[steps[i].get("code")] * steps[i].get("difficulty");
                    div += steps[i].get("difficulty");
                }

                console.log("sum = ", sum);
                console.log("div = ", div);

                return Promise.resolve(sum / div);
            })
        },
        getObjectById: function (object, id) {
            let query = new Parse.Query(object);
            return query.get(id, { useMasterKey: true });
        },
        getAnalyzesByPlayerAndDate: function (player, begin, end) {

            let query = new Parse.Query("Analyze");
            query.equalTo("player", player);
            query.greaterThanOrEqualTo('createdAt', begin);
            query.lessThanOrEqualTo('createdAt', end);
            return query.find();
        },
        calculateAverage: function (points) {
            let sum = 0, cont = 0;
            for (let i in points) {

                sum += points[i];
                cont++;
            }
            sum = sum / cont;
            console.log("SUM", sum);
            return sum.toFixed(1);
        },
        getNameByCode: function (code) {

            let query = new Parse.Query(Define.Step);
            query.equalTo("code", code);
            query.select("name");
            return query.first().then(function (step) {
                return Promise.resolve(step.get("name"));
            });

        },

        publicMethods: {

            createAnalyze: function () {

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId", "fundamentId", "points"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }

                let promises = [];
                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(_super.getObjectById(Parse.User, _params.playerId)); //[1] get player
                promises.push(_super.getObjectById(Define.Fundament, _params.fundamentId)); //[2] get fundament

                return Parse.Promise.when(promises).then(function (results) {
                    let player = results[1];
                    let fundament = results[2];
                    let analyze = new Define.Analyze();

                    if (!player.get("userGroup") || player.get("userGroup") !== "player" || _currentUser.id != player.get("coach").id)
                        return Promise.reject(Messages.error.ERROR_UNAUTHORIZED);

                    delete _params.playerId;
                    delete _params.fundamentId;
                    _params.player = player;
                    _params.fundament = fundament;
                    _params.coach = _currentUser;
                    _params.average = _super.calculateAverage(_params.points);

                    return analyze.save(_params, { useMasterKey: true });
                }).then(function (analyze) {
                    _response.success({ objectId: analyze.id });
                }, function (error) {
                    _response.error(error);
                });

            },
            editAnalyze: function () {

                var requiredFields = utils.verifyRequiredFields(_params, ["analyzeId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                let promises = [];
                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(_super.getObjectById(Define.Analyze, _params.analyzeId)); //[1] get analyze
                return Parse.Promise.when(promises).then(function (results) {
                    let analyze = results[1]

                    if (!analyze.get("coach") || analyze.get("coach").id !== _currentUser.id)
                        _response.error(Messages.error.ERROR_UNAUTHORIZED);

                    delete _params.analyzeId;
                    if (_params.points)
                        _params.average = _super.calculateAverage(_params.points);

                    return analyze.save(_params, { useMasterKey: true })
                }).then(function () {
                    _response.success(Messages.success.EDITED_SUCCESS);
                }, function (error) {
                    _response.error(error.code, error.message);
                });


            },
            deleteAnalyze: function () {


                var requiredFields = utils.verifyRequiredFields(_params, ["analyzeId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }
                let promises = [];
                promises.push(utils.verifyCoachPermissions(_currentUser)); //[0] verify coach permissions
                promises.push(_super.getObjectById(Define.Analyze, _params.analyzeId)); //[1] get analyze

                return Parse.Promise.when(promises).then(function (results) {
                    return results[1].destroy({ useMasterKey: true });
                }).then(function () {
                    _response.success(Messages.success.DELETED_SUCCESS);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            getAnalyzeById: function () {

                if (utils.verifyCoachPermissions(_currentUser)) {

                    var requiredFields = utils.verifyRequiredFields(_params, ["analyzeId"]);
                    if (requiredFields.length > 0) {
                        _response.error("Field(s) '" + requiredFields + "' are required.");
                        return;
                    }

                    return _super.getObjectById(Define.Analyze, _params.analyzeId).then(function (analyze) {

                        _response.success(utils.formatObjectToJson(analyze, listFields));
                    }, function (error) {
                        _response.error(error.code, error.message);
                    });
                }
            },
            getAnalyzesByPlayer: function () {

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required.");
                    return;
                }

                let promises = [];

                return _super.getObjectById(Parse.User, _params.playerId).then(function (player) {
                    let query = new Parse.Query(Define.Analyze);
                    query.equalTo('player', player);
                    query.descending('createdAt');
                    query.include("fundament");
                    query.include("player");
                    promises.push(query.count()); //[0] count analyzes
                    promises.push(query.find()); //[1] analyzes
                    return Parse.Promise.when(promises)
                }).then(function (results) {

                    let response = {};
                    let analyzes = results[1];
                    response.total = results[0];

                    var data = [];
                    for (var i = 0; i < analyzes.length; i++) {
                    data.push(utils.formatObjectToJson(analyzes[i], ["commentText", "commentAudio", "points", "player","fundament", "average"]));
                    }
                    response.analyzes = data;
                    _response.success(response);

                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            getAnalyzesByMonthAndYear: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["month", "year"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required.");
                    return;
                }

                //criando data 
                let now = new Date(_params.year, _params.month - 1);
                let begin = new Date(now.setDate(1));
                let end = new Date(new Date(_params.year, _params.month, 0));

                //criando a query
                let query = new Parse.Query(Define.Analyze);
                //maior ou igual 
                query.greaterThanOrEqualTo('createdAt', begin);
                //menor ou igual
                query.lessThanOrEqualTo('createdAt', end);

                query.find().then(function (result) {

                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["commentText", "commentAudio", "points", "player", "fundament"]));
                    }
                    _response.success(data);

                }, function (error) {
                    _response.error(error.code, error.message);
                });

            },
            getAnalyzesByYear: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["year"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required.");
                    return;
                }

                //criando data 
                let begin = new Date("01/01/" + _params.year);
                let end = new Date("12/31/" + _params.year);

                //criando a query
                let query = new Parse.Query(Define.Analyze);
                //maior ou igual 
                query.greaterThanOrEqualTo('createdAt', begin);
                //menor ou igual
                query.lessThanOrEqualTo('createdAt', end);

                query.find().then(function (result) {

                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["commentText", "commentAudio", "points", "player"]));
                    }
                    _response.success(data);

                }, function (error) {
                    _response.error(error.code, error.message);
                });

            },
            getAnalyzesByDate: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["date"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required.");
                    return;
                }

                //criando data 
                let begin = new Date(_params.date + "T00:00:00");
                let end = new Date(_params.date + "T23:59:59");

                //criando a query
                let query = new Parse.Query(Define.Analyze);
                query.greaterThanOrEqualTo('createdAt', begin);
                query.lessThanOrEqualTo('createdAt', end);
                query.find().then(function (result) {

                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["commentText", "commentAudio", "points", "player"]));
                    }
                    _response.success(data);

                }, function (error) {
                    _response.error(error.code, error.message);
                });

            },
            getAnalyzesBetweenDates: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["begin", "end"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required.");
                    return;
                }

                //criando data 
                let begin = new Date(_params.begin + "T00:00:00");
                let end = new Date(_params.end + "T23:59:59");

                //criando a query
                let query = new Parse.Query(Define.Analyze);
                query.greaterThanOrEqualTo('createdAt', begin);
                query.lessThanOrEqualTo('createdAt', end);
                query.find().then(function (result) {

                    var data = [];

                    for (var i = 0; i < result.length; i++) {
                        data.push(utils.formatObjectToJson(result[i], ["commentText", "commentAudio", "points", "player"]));
                    }
                    _response.success(data);

                }, function (error) {
                    _response.error(error.code, error.message);
                });


            },
            getAnalyzesMostRecent: function () {

                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                let promises = [];
                let query = new Parse.Query(Define.Analyze);
                query.descending('createdAt');
                query.include("player");
                query.include("fundament");
                promises.push(query.count()); //[0] count analyzes
                promises.push(query.find()); //[1] analyzes
                return Parse.Promise.when(promises).then(function (results) {

                    let response = {};
                    let analyzes = results[1];
                    response.total = results[0];

                    var data = [];
                    for (var i = 0; i < analyzes.length; i++) {
                        data.push(utils.formatObjectToJson(analyzes[i], ["commentText", "commentAudio", "points", "player", "fundament", "average"]));
                    }
                    response.analyzes = data;
                    _response.success(response);

                }, function (error) {
                    _response.error(error.code, error.message);
                });

            },
            getStatisticPlayerByYear: function () {

                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId", "year"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                //criando data 
                let begin = new Date("01/01/" + _params.year);
                let end = new Date("12/31/" + _params.year);

                return _super.getObjectById(Parse.User, _params.playerId).then(function (player) {
                    return _super.getAnalyzesByPlayerAndDate(player, begin, end)
                }).then(function (results) {

                    if (results.length > 0) {
                        return _super.calculateStatisticPlayer(results);
                    }
                    _response.success(Messages.success.NOT_FOUND_ANALYZE);
                }, function () {
                    _response.error(error.code, error.message);
                });

            },
            getStatisticPlayerByMonthAndYear: function () {
                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId", "year", "month"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }
                let now = new Date(_params.year, _params.month - 1);
                let begin = new Date(now.setDate(1));
                let end = new Date(new Date(_params.year, _params.month, 0));

                return _super.getObjectById(Parse.User, _params.playerId).then(function (player) {
                    return _super.getAnalyzesByPlayerAndDate(player, begin, end)
                }).then(function (results) {

                    if (results.length > 0) {
                        return _super.calculateStatisticPlayer(results);
                    }
                    _response.success(Messages.success.NOT_FOUND_ANALYZE);
                }, function () {
                    _response.error(error.code, error.message);
                });
            },
            getStatisticPlayerBetweenDates: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                var requiredFields = utils.verifyRequiredFields(_params, ["playerId", "begin", "end"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) " + requiredFields + " are required.");
                    return;
                }

                //criando data 
                let begin = new Date(_params.begin + "T00:00:00");
                let end = new Date(_params.end + "T23:59:59");

                return _super.getObjectById(Parse.User, _params.playerId).then(function (player) {
                    return _super.getAnalyzesByPlayerAndDate(player, begin, end)
                }).then(function (results) {

                    if (results.length > 0) {
                        return _super.calculateStatisticPlayer(results);
                    }
                    _response.success(Messages.success.NOT_FOUND_ANALYZE);
                }, function () {
                    _response.error(error.code, error.message);
                });
            },
            getStatisticPlayerMostRecents: function () {
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

                let query = new Parse.Query(Parse.User);
                query.get(_params.playerId).then(function (player) {

                    let query = new Parse.Query(Define.Analyze);
                    query.equalTo("player", player);
                    query.descending("createdAt");
                    query.limit(3);
                    return query.find()

                }).then(function (results) {
                    console.log(results);
                    if (results.length > 0) {
                        return _super.calculateStatisticPlayer(results);
                    }
                    _response.success(Messages.success.NOT_FOUND_ANALYZE);
                }, function () {
                    _response.error(error.code, error.message);
                });
            }



        }
    };

    return _super;
}

exports.instance = Analyze;

Parse.Cloud.beforeSave(Define.Analyze, function (request, response) {
    Analyze(request, response).beforeSave();
});

Parse.Cloud.afterSave(Define.Analyze, function (request) {
    Analyze(request).afterSave();
});

Parse.Cloud.afterDelete(Define.Analyze, function (request) {
    Analyze(request).afterDelete();
});

for (var key in Analyze().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        utils.printLogAPI(request)
        Analyze(request, response).publicMethods[request.functionName]();
    });
}

