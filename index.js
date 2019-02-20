const express = require('express')
const admin = require("firebase-admin");
const uuidv1 = require('uuid/v1');
const session = require('express-session');
const bodyParser = require('body-parser');
const Passport = require('./auth');
const { databaseURL, projectId, sessionSecret, firebaseCert } = require('./config');
const {google} = require('googleapis');

var cloudResourceManager = google.cloudresourcemanager('v1');
const { passport } = Passport;
const app = express()
const port = 8080;

const invalidUserMessage = 'Invalid User'
const nonEditableUserMessage = 'Non-editable User'


admin.initializeApp({
    credential: admin.credential.cert(firebaseCert),
    databaseURL: databaseURL
});

const db = admin.database();

app.set("view engine", "ejs");
app.use(bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(session({ secret: sessionSecret, cookie: { maxAge: 60 * 60 * 1000 }, resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', Passport.isLoggedIn);

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
        const email = req.user.emails[0].value
        try {
            req.session.editable = await getIamPolicy(email)
            res.redirect('/');
        } catch (err) {
            res.send(err)
        }
    }
);

app.get('/', async (req, res) => {
    if (req.session.editable === undefined) {
        res.send(invalidUserMessage)
        return
    }

    const result = await db.ref("modules").once('value')
    const val = result.val()
    const data = []
    Object.keys(val).forEach(e => {
        data.push({
            id: e,
            ...val[e]
        })
    })
    res.render('./index.ejs', { data: data, isEditable: req.session.editable });
})

app.get('/addTile', (req, res) => {
    if (validateEditableUser(req, res) === false) {
        return
    }

    res.render("./list.ejs", {
        data: {
            id: `ext-${uuidv1()}`,
            config: { color: "", imageUrl: "", iconUrl: "" },
            name: "",
            url: "",
            version: "",
            type: "web",
            appLink: { ios: "", android: ""},
            storeLink: { ios: "", android: ""},
        }, isEditable: req.session.editable 
    })
})

app.put('/tiles/update/:id', async (req, res) => {
    if (validateEditableUser(req, res) === false) {
        return
    }

    const data = getData(req)
    db.ref(`modules/${req.params.id}`).set(data)
    res.send({ id: req.params.id })
})

app.delete('/tiles/delete/:id', (req, res) => {
    if (validateEditableUser(req, res) === false) {
        return
    }

    db.ref(`modules/${req.params.id}`).remove()
    res.send({ id: req.params.id })
})

app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err);
    }
    console.log(`app is listening on ${port}`);
});

function validateEditableUser(req, res) {
    if (req.session.editable === undefined) {
        res.send(invalidUserMessage)
        return false
    } else if (req.session.editable === false) {
        res.send(nonEditableUserMessage)
        return false
    }
    return true
}

function getData(req) {
    const data = { ...req.body, 
                    config: { color: req.body.color, imageUrl: req.body.imageUrl, iconUrl: req.body.iconUrl }
                 }

    if (req.body.type === 'native') {
        data.appLink = { ios: req.body.iOSAppLink, android: req.body.androidAppLink}
        data.storeLink = { ios: req.body.iOSStoreLink, android: req.body.androidStoreLink}
        delete data.url
    }
    delete data.color
    delete data.imageUrl
    delete data.iconUrl
    delete data.iOSAppLink
    delete data.androidAppLink
    delete data.iOSStoreLink
    delete data.androidStoreLink
    return data
}

function getIamPolicy(email) {
    return new Promise((resolve, reject) => {
        authorize((authClient) => {
            const request = {
                resource_: projectId,
                resource: {
                },

                auth: authClient,
            };

            cloudResourceManager.projects.getIamPolicy(request, function (err, response) {
                if (err) {
                    reject(invalidUserMessage)
                    return
                }


                const data = response.data.bindings.find(data => data.members.includes(`user:${email}`))

                if (!data) {
                    reject(invalidUserMessage)
                    return
                }

                if (data.role.includes("owner") || data.role.includes("editor")) {
                    resolve(true)
                    return
                }
                resolve(false)
            });
        });
    });
}

function authorize(callback) {
    google.auth.getApplicationDefault(function (err, authClient) {
        if (err) {
            console.error('authentication failed: ', err);
            return;
        }
        if (authClient.createScopedRequired && authClient.createScopedRequired()) {
            var scopes = ['https://www.googleapis.com/auth/cloud-platform'];
            authClient = authClient.createScoped(scopes);
        }
        callback(authClient);
    });
}