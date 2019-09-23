'use strict';
const utils = require("./Utils.js");
const conf = require('config');
const Define = require('./Define.js');
const Mail = require('./mailTemplate.js');
const Messages = require('./Messages.js');
const listFields = [
    "isAdmin", "userType", "isNew", "token", "cover",
    "profileImage", "blocked", "isFacebook", "username", "name", "email", "password",
    "updatedAt", "authData", "createdAt", "objectId", "ACL", "_perishable_token", "_email_verify_token",
    "emailVerified", "dateOfBirth", "team", "userGroup", "weight", "height", "adress", "phone", "genre", "favorited",
    "level", "points", "lastAnalyze", "badSteps", "goodSteps", "mediumSteps", "countAnalyze", "coach"
];
const listRequiredFields = [];
let mapUsersSending = {};

function User(request, response) {
    let _request = request;
    let _response = response;
    let _currentUser = request ? request.user : null;
    let _params = request ? request.params : null;

    let _super = {
        beforeSave: function () {
            let promise = new Parse.Promise();
            let object = _request.object;
            let wrongFields = utils.verify(object.toJSON(), listFields);
            if (wrongFields.length > 0) {
                _response.error("Field(s) '" + wrongFields + "' not supported.");
            }
            let requiredFields = utils.verifyRequiredFields(object.toJSON(), listRequiredFields);
            if (requiredFields.length > 0) {
                _response.error("Field(s) '" + requiredFields + "' are required.");
                return;
            }

            if (object.get("authData") != null && Parse.FacebookUtils.isLinked(object)) {
                let url = 'https://graph.facebook.com/me?fields=email,picture.width(400).height(400),gender,name&access_token=' + object.get('authData').facebook.access_token;
                Parse.Cloud.httpRequest({ url: url }).then(function (httpResponse) {
                    object.set("profileImage", httpResponse.data.picture.data.url);
                    object.set("name", httpResponse.data.name);
                    object.set("isFacebook", true);
                    if (httpResponse.data.email != null && httpResponse.data.email != "")
                        object.set("email", httpResponse.data.email.toLowerCase().trim());
                    else
                        object.set("email", httpResponse.data.id + "@email.com");
                    promise.resolve();
                }, function (error) {
                    promise.reject(error);
                });
            }
            else {
                promise.resolve();
            }
            return Parse.Promise.when(promise).then(function () {
                if (object.get("email") && object.get("email").length > 0) {
                    object.set("email", object.get("email").toLowerCase().trim());
                }
                if (object.get("email") && object.get("username") !== object.get("email")) {
                    object.set("username", object.get("email"));
                }
                return _response.success();
            }, function (error) {
                return _response.error(error);
            });
        },
        afterSave: function () {
            let object = _request.object;
            if (object.get("isNew") && !mapUsersSending[object.id]) {
                mapUsersSending[object.id] = true;
                object.set("isNew", false);
                return object.save(null, { useMasterKey: true }).then(function () {
                    return Mail.welcomeEmail(object.get("email"), object.get("email"));
                });
            }
        },
        beforeDelete: function () {
            if (request.master) {
                _response.success();
            } else {
                _response.error(Messages.error.ERROR_UNAUTHORIZED);
            }
        },
        formatName: function (user) {
            let email = user.get("email") || "";
            return user.get("name") || utils.capitalizeFirstLetter(email.replace(/[\W_]+/, " ").split(" ")[0]);
        },
        getUserById: function (id) {
            let query = new Parse.Query(Parse.User);
            return query.get(id, { useMasterKey: true });
        },
        formatUser: function (user) {
            let output = {
                "objectId": user.id,
                "name": user.get("name"),
                "email": user.get("email"),
                "profileImage": user.get("profileImage")
            }
            return output;
        },
        publicMethods: {
            signUp: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["email", "password"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                let user = new Parse.User();
                _params.email = _params.email.toLowerCase().trim();
                user.set("isFacebook", false);
                user.set("profileImage", _params.profileImage);
                user.set("password", _params.password);
                user.set("username", _params.email);
                user.set("email", _params.email);
                user.set("name", _params.name);
                if (_params.isAdmin !== undefined)
                    user.set("isAdmin", _params.isAdmin);
                user.signUp(null, {
                    success: function (response) {
                        console.log("\n 1response\n")
                        return _response.success(response);
                    },
                    error: function (user, error) {
                        return _response.error(error.code, error.message);
                    }
                });
            },
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
            logIn: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["login", "password"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                let promise = new Parse.Promise();
                _params.login = _params.login.toLowerCase().trim();
                if (utils.validateEmail(_params.login)) {
                    let query = new Parse.Query(Parse.User);
                    query.equalTo("username", _params.login);
                    query.first().then(function (user) {
                        if (user) {
                            promise.resolve(user.get("username"));
                        }
                        else {
                            _response.error(Messages.error.INVALID_USERNAME.code, Messages.error.INVALID_USERNAME.message);
                        }
                    });
                }
                else {
                    promise.resolve(_params.login);
                }
                console.log("----")
                Parse.Promise.when(promise).then(function (login) {
                    console.log("----2")

                    Parse.User.logIn(login, _params.password, {
                        useMasterKey: true
                    }).then(function (response) {
                        console.log("----3")

                        _response.success(response);
                    }, function (error) {
                        console.log("----4")
                        console.log("ee", error.message);
                        switch (error.message) {
                            case "Invalid username/password.":
                                _response.error(Messages.error.INVALID_USERNAME.code, Messages.error.INVALID_USERNAME.message);
                                break;
                            case "User email is not verified.":
                                _super.resendEmailVerification(login).then(function () {
                                    _response.error(400, error.message);
                                });
                                break;
                            default:
                                _response.error(400, error.message);
                        }
                    }
                    );
                })
            },
            logInFacebook: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["token"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                // let _deviceInfo, _language, promise, _inviteBy;
                // let _appIdentifier = _params.appIdentifier;
                // let _installationId = _params.installationId;
                // let _deviceType = _params.deviceType;
                // let _deviceToken = _params.deviceToken;
                let _password = utils.makeRandomPass(6);
                let _data, _login, _user;
                let url = 'https://graph.facebook.com/me?fields=email,picture.width(400).height(400),gender,name&access_token=' + _params.token;
                //pegando informações do dispositivo que esta utilizando pelo usuário no cadastro
                // if (_params.deviceInfo) {
                //     _language = _params.deviceInfo.language ? _params.deviceInfo.language : null;
                //     _deviceInfo = _params.deviceInfo;
                //     delete _params.deviceInfo;
                // } else {
                //     _deviceInfo = undefined;
                //     _language = "pt";
                // }

                return Parse.Cloud.httpRequest({ url: url }).then(function (httpResponse) {

                    _data = httpResponse.data;
                    if (!_data.email)
                        _data.email = _data.id + "@email.com";

                    let query = new Parse.Query(Parse.User);
                    //query.equalTo("email", httpResponse.data.email.toLowerCase().trim());
                    query.equalTo("email", _data.email);
                    return query.first();
                }).then(function (user) {

                    _login = _data.email.toLowerCase().trim();

                    if (!user) {
                        user = new Parse.User();

                        user.set("profileImage", _data.picture.data.url);
                        user.set("name", _data.name);
                        user.set("isFacebook", true);
                        user.set("email", _data.email.toLowerCase().trim());
                        user.set("username", _data.email.toLowerCase().trim());
                        user.set("isNew", true);
                        // user.set("language", "pt");
                        user.set("isAdmin", false);
                    }
                    user.set("password", _password);
                    return user.save(null, { useMasterKey: true });
                }).then(function (user) {
                    _user = user;
                    return user.logIn(_login, _password, { useMasterKey: true })
                }).then(function (user) {
                    //salvando device info
                    //if (_deviceInfo) _super.saveDeviceInfo(_deviceInfo, user.id);
                    //parâmetros sobre o instalação do app no dispositivo
                    // if (_appIdentifier && _installationId && _deviceType) //&& _deviceToken)
                    //     _super.saveInstallationId(_appIdentifier, _installationId, _deviceType, _deviceToken, user.id, _language);
                    return _response.success(user);
                }, function (error) {
                    return _response.error(error.code, error.message);
                });
            },
            logInAdmin: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["login", "password"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                let promise = new Parse.Promise();
                _params.login = _params.login.toLowerCase().trim();
                if (utils.validateEmail(_params.login)) {
                    let query = new Parse.Query(Parse.User);
                    query.equalTo("email", _params.login);
                    query.equalTo("isAdmin", true);//only admin users
                    query.first().then(function (user) {
                        if (user) {
                            promise.resolve(user.get("username"));
                        }
                        else {
                            _response.error(400, Messages.error.INVALID_USERNAME);
                        }
                    });
                }
                else {
                    promise.resolve(_params.login);
                }
                console.log("----")
                Parse.Promise.when(promise).then(function (login) {
                    console.log("----2")

                    Parse.User.logIn(login, _params.password, {
                        useMasterKey: true
                    }).then(function (response) {
                        console.log("----3")

                        _response.success(response);
                    }, function (error) {
                        console.log("----4")
                        console.log("ee", error.message);
                        switch (error.message) {
                            case "Invalid username/password.":
                                _response.error(400, Messages.error.INVALID_USERNAME);
                                break;
                            case "User email is not verified.":
                                _super.resendEmailVerification(login).then(function () {
                                    _response.error(400, error.message);
                                });
                                break;
                            default:
                                _response.error(400, error.message);
                        }
                    }
                    );
                })
            },
            resendEmailVerification: function (username) {
                let promise = new Parse.Promise();
                let query = new Parse.Query(Parse.User);
                query.equalTo('username', username);
                let email = "";
                query.first({ useMasterKey: true }).then(function (userObj) {
                    if (userObj != undefined) {
                        email = userObj.get("email");
                        userObj.unset("email"); // set empty
                        return userObj.save(null, { useMasterKey: true });
                    } else {
                        return promise.reject("INVALID_USER");
                    }
                }).then(function (updatedObj) {
                    updatedObj.set("email", email); // set email to trigger resend verify Email
                    return updatedObj.save(null, { useMasterKey: true });
                }).then(function (obj) {
                    promise.resolve();
                }, function (error) {
                    promise.reject(error);
                });
                return promise;
            },
            recoverPassword: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["email"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                _params.email = _params.email.toLowerCase().trim();
                let query = new Parse.Query(Parse.User);
                query.equalTo("email", _params.email);
                let name;
                return query.first({ useMasterKey: true }).then(function (user) {
                    if (!user) {
                        _response.error(Messages.error.ERROR_EMAIL_NOT_FOUND.code, Messages.error.ERROR_EMAIL_NOT_FOUND.message);
                        return;
                    }
                    let username = user.get("username");
                    name = _super.formatName(user);
                    let token = (0, utils.randomString)(25);
                    user.set("token", token);
                    return user.save(null, { useMasterKey: true })
                }).then(function (user) {
                    console.log("recover");
                    let url = conf.linkPage + "/change_password/?token=" + user.get("token") + "&username=" + user.get("username");
                    return Mail.recoverPassword(name, user.get("email"), url)
                }).then(function () {
                    _response.success(Messages.success.RECOVER_EMAIL_SUCCESS);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            updateRecoverPassword: function () {
                let requiredFields = utils.verifyRequiredFields(_params, ["username", "token", "password"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                let query = new Parse.Query(Parse.User);
                query.equalTo("username", _params.username.toLowerCase().trim());
                query.equalTo("token", _params.token);
                query.first({ useMasterKey: true }).then(function (user) {
                    console.log("user", user)
                    if (user) {
                        user.set("password", _params.password);
                        user.unset("_perishable_token");
                        user.unset("_perishable_token_expires_at");
                        user.unset("token");
                        user.save(null, { useMasterKey: true }).then(function () {
                            _response.success(true);
                        }, function (error) {
                            _response.error(error.code, error.message);
                        })
                    }
                    else {
                        _response.error(Messages.error.ERROR_USERNAME_NOT_FOUND.code, Messages.error.ERROR_USERNAME_NOT_FOUND.message);
                    }
                });
            },
            editPassword: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                let requiredFields = utils.verifyRequiredFields(_params, ["oldPassword", "newPassword"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                console.log("--> ", _currentUser)
                console.log("--> ", _currentUser.get("username"))
                return Parse.User.logIn(_currentUser.get("username"), _params.oldPassword).then(function (user) {
                    user.set("password", _params.newPassword);
                    return user.save(null, { useMasterKey: true });
                }).then(function () {
                    return Parse.User.logIn(_currentUser.get("username"), _params.newPassword)
                }).then(function (user) {
                    _response.success(user);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            updateUser: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                return _super.getUserById(_currentUser.id).then(function (user) {
                    if (user.get("isFacebook")) {
                        delete _params.username;
                    }
                    delete _params.password;
                    return utils.formatUrlTitle(Parse.User, user.id, _super.formatName(user))
                }).then(function (link) {
                    return _currentUser.save(_params, { useMasterKey: true });
                }).then(function (savedUser) {
                    _response.success(savedUser);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            listUsers: function () {
                if (!_currentUser || !_currentUser.get("isAdmin")) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                let query = new Parse.Query(Parse.User);
                let LIMITPAGE = 1000;
                let PAGE = 0;
                if (_params.limit) {
                    if (Object.prototype.toString.call(_params.limit) !== '[object Number]') {
                        _response.error({
                            "code": 400,
                            "message": "limit expected [object Number] but got " + Object.prototype.toString.call(_params.limit)
                        });
                        return;
                    }
                }
                _params.limit = _params.limit !== undefined ? _params.limit : LIMITPAGE;
                if (_params.page) {
                    if (Object.prototype.toString.call(_params.page) !== '[object Number]') {
                        _response.error({
                            "code": 400,
                            "message": "page expected [object Number] but got " + Object.prototype.toString.call(_params.page)
                        });
                        return;
                    }
                }
                _params.page = _params.page !== undefined ? _params.page : PAGE;
                query.limit(_params.limit);
                query.skip(_params.page * _params.limit);
                query.find({ useMasterKey: true }).then(function (usersList) {
                    let objs = [];
                    for (let i = 0; i < usersList.length; i++) {
                        objs.push(_super.formatUser(usersList[i]));
                    }
                    _response.success(objs);
                })
            },
            getUserById: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                let requiredFields = utils.verifyRequiredFields(_params, ["userId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                return _super.getUserById(_params.userId).then(function (user) {
                    _response.success(user);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            deleteUser: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                let requiredFields = utils.verifyRequiredFields(_params, ["userId"]);
                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "' are required.");
                    return;
                }
                return _super.getUserById(_params.userId).then(function (user) {
                    return user.destroy({ useMasterKey: true })
                }).then(function () {
                    _response.success(Messages.success.DELETED_SUCCESS);
                }, function (error) {
                    _response.error(error.code, error.message);
                });
            },
            isLoggedIn: function () {

                if (!_currentUser) {
                    _response.error();
                    return;
                }

                _response.success(true);

            },
            deleteUserProfileImage: function () {
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }
                _currentUser.unset("profileImage");
                return _currentUser.save(null, { useMasterKey: true }).then(function (user) {
                    _response.success(user);
                }, function (error) {
                    _response.error(error.code, error.message);
                });

            },
            editUserProfileImage: function () {
                //Somente usuário logados 
                if (!_currentUser) {
                    _response.error(Messages.error.ERROR_UNAUTHORIZED);
                    return;
                }

                let requiredFields = utils.verifyRequiredFields(_params, ["userId", "profileImage"]);

                if (requiredFields.length > 0) {
                    _response.error("Field(s) '" + requiredFields + "'are required.");
                    return;
                }

                //utilizando metódo privado (_super.getplayerById)
                return _super.getUserById(_params.playerId).then(function (user) {
                    user.set("profileImage", _params.profileImage);
                    return user.save()

                }).then(function (user) {
                    _response.success(user);
                }, function (error) {
                    response.error(error.code, error.message);
                });
            },
        }
    };
    return _super;
}

exports.instance = User;

/* CALLBACKS */
Parse.Cloud.beforeSave(Parse.User, function (request, response) {
    User(request, response).beforeSave();
});
Parse.Cloud.afterSave(Parse.User, function (request) {
    User(request).afterSave();
});
Parse.Cloud.beforeDelete(Parse.User, function (request, response) {
    User(request, response).beforeDelete();
});

for (let key in User().publicMethods) {
    Parse.Cloud.define(key, function (request, response) {
        utils.printLogAPI(request)
        User(request, response).publicMethods[request.functionName]();
    });
}