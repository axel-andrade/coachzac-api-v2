var express = require('express');
const conf = require('config');
var compression = require('compression');
var Server = require('parse-server').ParseServer;
var Dashboard = require('parse-dashboard');
var port = process.env.PORT || conf.port;
var server = process.env.SERVER_URL || conf.server;
const MASTERKEY = process.env.MASTER_KEY || conf.masterKey;

var api = new Server({
    verbose: false,
    logLevel: conf.logLevel || "error",
    databaseURI: process.env.DATABASE_URI || conf.databaseUri,
    cloud: __dirname + '/lib/main.js',
    appId: process.env.APP_ID || conf.appId,
    masterKey: MASTERKEY,
    serverURL: server,
    publicServerURL: server,
    appName: process.env.APP_NAME || conf.appName,
    maxUploadSize: '1000Mb',
    //permite criação de classe pelo cliente
    allowClientClassCreation: true,
    preventLoginWithUnverifiedEmail: true,
    facebookAppIds: conf.FacebookID,
    // verifyUserEmails: true,
    liveQuery: {
        classNames: []
    },
    customPages: {
        invalidLink: undefined,
        verifyEmailSuccess: conf.linkPage + "/#/user/login",
        choosePassword: conf.linkPage + "/#/user/recover-password",
        passwordResetSuccess: conf.linkPage + "/#/user/login"
    },
});

var dashboard = new Dashboard({
    allowInsecureHTTP: true,
    "apps": [
        {
            "serverURL": server,
            "appId": process.env.APP_ID || conf.appId,
            "masterKey": MASTERKEY,
            "appName": process.env.APP_NAME || conf.appName,
            "iconName": "icon.png"
        }],
    "users": [
        {
            "user": process.env.APP_NAME,
            "pass": process.env.APP_NAME + ".0)dash"
        }
    ],
    // "iconsFolder": "appicons",
    "trustProxy": 1
}, {allowInsecureHTTP: true});
var app = express();
process.setMaxListeners(0);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var mountPath = '/use';
app.use(mountPath, api);
app.use('/dashboard', dashboard);
app.use(compression())
app.get('/', function (req, res) {
    res.status(200).send(':)');
});
app.get('/docs', function (req, res) {
    res.redirect(conf.docs);
});
app.use('/img', express.static('img'));
var httpServer = require('http').createServer(app);
httpServer.listen(process.env.PORT || port, function () {
    console.log('Running on port ' + port + '.');
});
var parseLiveQueryServer = Server.createLiveQueryServer(httpServer);