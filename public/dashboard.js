var OVsList = new Vue({
    el: "#OVsList",
    data: {
        OVs: []
    },
    methods: {
        openModalLog(element) {
            modal.header = "Details";
            modal.qr = element.publisherUrl;
            modal.isAddCameraModal = false;
            modal.showModal();
        }
    }
})

var modal = new Vue({
    el: "#modal",
    data: {
        header: "",
        cameraNameInputbox: "",
        cameraNoteInputbox: "",
        qr: "",
        subscriberUrl: "",
        isAddCameraModal: false,
        video: "<p>hehe</p>"
    },
    methods: {
        showModal() {
            // qr.makeCode(this.qr);
            $(this.$el).on("hidden.bs.modal", function (e) {
                // qr.clear();
                var OV = OVsList.OVs.filter(function (item) {
                    return item.publisherUrl.match(this.qr)
                })[0];
                OV.justName = modal.cameraNameInputbox; // TODO: Change modal to this
                OV.justNote = modal.cameraNoteInputbox; // TODO: Change modal to this
                /* if (!this.isAddCameraModal && OV.isOnline) { // TODO: Add preview video
                    OV.subscriber.addVideoElement("camera-video-element");
                } */
            });
            $(this.$el).modal();
        }
    }
})
// qr = new QRCode(document.getElementById("qrcode"));

function addCamera() {
    var OV = new OpenVidu();
    var session = OV.initSession();
    var sessionName = makeid(4);

    var publisherUrl = window.location.protocol + "//" + window.location.hostname + (() => { if (window.location.port) { return ":" + window.location.port }; return "" })() + "/publisher/?sessionName=" + sessionName;
    var subscriberUrl = window.location.protocol + "//" + window.location.hostname + (() => { if (window.location.port) { return ":" + window.location.port }; return "" })() + "/subscriber/?sessionName=" + sessionName;
    var name = generateName();

    modal.qr = publisherUrl;
    modal.subscriberUrl = subscriberUrl;
    modal.header = "Add Camera";
    modal.cameraNameInputbox = name;
    modal.cameraNoteInputbox = "Note doang kan. Kacang ijo enakk...";
    modal.isAddCameraModal = true;
    modal.showModal();

    OVsList.OVs.unshift({
        justName: name,
        justNote: "Note doang kan. Kacang ijo enakk...",
        isOnline: false,
        sessionName: sessionName,
        publisherUrl: publisherUrl,
        subscriberUrl: subscriberUrl,
        stream: {},
        session: session,
        token: sessionName,
        subscriber: {}
    });

    session.on('streamCreated', (event) => {
        streamOnlineAlert.showAlert()

        var subscriber = session.subscribe(event.stream, undefined);
        var clientData = subscriber.stream.connection.data.split('%/%')[0];

        console.log(clientData);

        var OV = OVsList.OVs.filter(function (item) {
            return item.token.match(clientData)
        })[0];
        OV.isOnline = true;
        OV.subscriber = subscriber;
    })

    session.on('streamDestroyed', (event) => {
        streamOfflineAlert.showAlert()

        var subscriber = session.subscribe(event.stream, undefined);
        var clientData = subscriber.stream.connection.data.split('%/%')[0];

        var OV = OVsList.OVs.filter(function (item) {
            return item.token.match(clientData)
        })[0];
        OV.isOnline = false;
        OV.subscriber = {};
    })

    getToken(sessionName, (token) => {

        session.connect(token, sessionName)
            .catch(error => {
                console.log("There was an error connecting to the session:", error.code, error.message);
            });

    });

}


function httpPostRequest(url, body, errorMsg, callback) {
    var http = new XMLHttpRequest();
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.addEventListener('readystatechange', processRequest, false);
    http.send(JSON.stringify(body));

    function processRequest() {
        if (http.readyState == 4) {
            if (http.status == 200) {
                try {
                    callback(JSON.parse(http.responseText));
                } catch (e) {
                    callback();
                }
            } else {
                console.warn(errorMsg);
                console.warn(http.responseText);
            }
        }
    }
}

function getToken(sessionName, callback) {

    httpPostRequest(
        '/api-sessions/get-token',
        { sessionName: sessionName },
        'Request of TOKEN gone WRONG:',
        (response) => {
            token = response[0]; // Get token from response
            console.warn('Request of TOKEN gone WELL (TOKEN:' + token + ')');
            callback(token); // Continue the join operation
        }
    );
}


// make random character
function makeid(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


/*
(c) by Thomas Konings
Random Name Generator for Javascript
*/
function generateName() {
    function capFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    var name1 = ["abandoned", "able", "absolute", "adorable", "adventurous", "academic", "acceptable", "acclaimed", "accomplished", "accurate", "aching", "acidic", "acrobatic", "active", "actual", "adept", "admirable", "admired", "adolescent"];

    var name2 = ["people", "history", "way", "art", "world", "information", "map", "family", "government", "health", "system", "computer", "meat", "year", "thanks", "music", "person", "reading", "method", "data", "food", "understanding", "theory", "law", "bird", "literature", "software", "control", "knowledge", "power", "ability", "economics", "love"];

    var name = capFirst(name1[getRandomInt(0, name1.length + 1)]) + ' ' + capFirst(name2[getRandomInt(0, name2.length + 1)]);
    return name;

}

function myPopup(url, windowname, w, h, x, y) {
    window.open(url, windowname, "resizable=no,toolbar=no,scrollbars=no,menubar=no,status=no,directories=n o,width=" + w + ",height=" + h + ",left=" + x + ",top=" + y + "");
    console.log("Opening: " + windowname);
}

// Vue

var streamOfflineAlert = new Vue({
    el: "#stream-offline-alert",
    data() {
        return {
            dismissSecs: 10,
            dismissCountDown: 0,
            showDismissibleAlert: false
        }
    },
    methods: {
        countDownChanged(dismissCountDown) {
            this.dismissCountDown = dismissCountDown
        },
        showAlert() {
            this.dismissCountDown = this.dismissSecs
        }
    }
})

var streamOnlineAlert = new Vue({
    el: "#stream-online-alert",
    data() {
        return {
            dismissSecs: 10,
            dismissCountDown: 0,
            showDismissibleAlert: false
        }
    },
    methods: {
        countDownChanged(dismissCountDown) {
            this.dismissCountDown = dismissCountDown
        },
        showAlert() {
            this.dismissCountDown = this.dismissSecs
        }
    }
})

var hehu = new Vue({
    el: "#hehu",
    data: {
        title: "Hehusss",
        cameraNameInputbox: "",
        cameraNoteInputbox: "",
        qr: "kikiki",
        isAddCameraModal: true
    },
    mounted: function() {
        // qr2.makeCode("hehu");
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            qr2 = new QRCode(document.getElementById("qrcode2"), "hehu");
            console.log('Modal is about to be shown', bvEvent, modalId);
        });
    }
})