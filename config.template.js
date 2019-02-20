const googleClientInfo = {
    clientID: 'myGoogleClientId.apps.googleusercontent.com',
    clientSecret: 'myGoogleSecret',
    callbackURL: '/auth/google/callback',
    proxy: true
};

const projectId = "my-firebase-project"
const databaseURL = `https://${projectId}.firebaseio.com`
const sessionSecret = 'mySecret'
const firebaseCert = require('./MyCert.json')


exports.googleClientInfo = googleClientInfo;
exports.databaseURL = databaseURL;
exports.projectId = projectId;
exports.sessionSecret = sessionSecret;
exports.firebaseCert = firebaseCert;
