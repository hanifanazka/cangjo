// @ts-nocheck

const fs = require("fs");
const path = require("path");
const https = require("https");
const OpenVidu = require("openvidu-node-client").OpenVidu;
const OpenViduRole = require("openvidu-node-client").OpenViduRole;
const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const hash = require("pbkdf2-password")();

dotenv.config();
const port = process.env.PORT || 5000;
const runEnvironment = process.env.NODE_ENV || "production";
const openViduUrl = process.env.OPENVIDU_URL;
const openViduSecret = process.env.OPENVIDU_SECRET;
// Be carefull! Dummy cookie session id... Please use your own
const sessionID = process.env.SESSION_ID || "kH4ouHfwRFZKjzbdpFPLH9wcKQGgmBQg";

if (!openViduUrl && !openViduSecret) {
    console.log("Please add OPENVIDU_URL OPENVIDU_SECRET at .env OR Use OPENVIDU_URL= OPENVIDU_SECRET= when execute this script");
    process.exit(-1);
}

const app = express();
app.use(express.json())

// config

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// middleware

app.use(express.urlencoded({ extended: false }))
app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: sessionID
}));

// Session-persisted message middleware
app.use("/login", function (req, res, next) {
    var err = req.session.error;
    var msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = "";
    if (err) res.locals.message = '<div class="alert alert-danger" role="alert">' + err + '</div>';
    if (msg) res.locals.message = '<div class="alert alert-success" role="alert">' + msg + '</div>';
    next();
});

app.get("/", function (req, res) {
    res.redirect("/login");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/publisher", function (req, res) {
    res.render("publisher");
});

app.get("/subscriber", function (req, res) {
    res.render("subscriber");
});

app.get("/dashboard", restrict, function (req, res) {
    res.render("dashboard");
})

app.get("/logout", function (req, res) {
    // destroy the user"s session to log them out
    // will be re-created next request
    req.session.destroy(function () {
        res.redirect("/");
    });
});

app.post("/login", function (req, res) {
    authenticate(req.body.username, req.body.password, function (err, user) {
        if (user) {
            // Regenerate session when signing in
            // to prevent fixation
            req.session.regenerate(function () {
                // Store the user's primary key
                // in the session store to be retrieved,
                // or in this case the entire user object
                req.session.user = user;
                req.session.success = 'Authenticated as <b>' + user.name
                    + '</b> click to <a href="/logout" class="text-danger">logout</a>. ';
                res.redirect("/dashboard");
            });
        } else {
            req.session.error = "Authentication failed, please check your "
                + " username and password.";
            res.redirect("/login");
        }
    });
});

// dummy database
var users = {
    tj: { name: "tj" }
};

// when you create a user, generate a salt
// and hash the password ("foobar" is the pass here)

hash({ password: "foobar" }, function (err, pass, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users.tj.salt = salt;
    users.tj.hash = hash;
});


// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {
    if (!module.parent) console.log("authenticating %s:%s", name, pass);
    var user = users[name];
    // query the db for the given username
    if (!user) return fn(new Error("cannot find user"));
    // apply the same algorithm to the POSTed password, applying
    // the hash against the pass / salt, if there is a match we
    // found the user
    hash({ password: pass, salt: user.salt }, function (err, pass, salt, hash) {
        if (err) return fn(err);
        if (hash === user.hash) return fn(null, user)
        fn(new Error("invalid password"));
    });
}

function restrict(req, res, next) {
    if (req.session.user || runEnvironment === "development") {
        next();
    } else {
        req.session.err = "Access denied!";
        res.redirect("/login");
    }
}

var openVidu = new OpenVidu(openViduUrl, openViduSecret);

// Collection to pair session names with OpenVidu Session objects
var mapSessions = {};
// Collection to pair session names with tokens
var mapSessionNamesTokens = {};

// When browser ask for token
app.post("/api-sessions/get-token", function (req, res) {
    var sessionName = req.body.sessionName;
    var connectionProperties = {
        role: OpenViduRole.PUBLISHER,
        data: "TODO: serverData"
    };

    console.log("Getting a token | {sessionName}={" + sessionName + "}");
    if (mapSessions[sessionName]) {
        if (mapSessionNamesTokens[sessionName].length > 99) {
            // Session already exists and is full
            console.log("Existing session and is full " + sessionName);
            res.status(404).send("Session already exists and is full");
        } else {
            // Session already exists
            console.log("Existing session " + sessionName);

            // Get the existing Session from the collection
            var mySession = mapSessions[sessionName];

            mySession.createConnection(connectionProperties)
                .then(connection => {

                    // Store the new token in the collection of tokens
                    mapSessionNamesTokens[sessionName].push(connection.token);

                    // Return the token to the client
                    res.status(200).send({
                        0: connection.token
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        }
    } else {
        // New session
        console.log("New session " + sessionName);

        // 1. Create a session
        openVidu.createSession().then(session => {

            // Store the new Session in the collection of Sessions
            mapSessions[sessionName] = session;
            // Store a new empty array in the collection of tokens
            mapSessionNamesTokens[sessionName] = [];

            // 2. Create a connection
            session.createConnection(connectionProperties).then(connection => {

                // Store the new token in the collection of tokens
                mapSessionNamesTokens[sessionName].push(connection.token);

                // Return the Token to the client
                res.status(200).send({
                    0: connection.token
                });
            });
        });
    }
});



app.use(express.static("public"));

// Listen (start app with node server.js)
if (runEnvironment === "production") {

    app.listen(port, () => {
        console.log(`App listening at port: ${port}`);
    })

} else {

    // For demo purposes we ignore self-signed certificate
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
    // Use dummy HTTPS for development
    var options = {
        key: fs.readFileSync("openvidukey.pem"),
        cert: fs.readFileSync("openviducert.pem")
    };

    https.createServer(options, app).listen(port, () => {
        console.log(`App listening at port: ${port}`);
    });

}