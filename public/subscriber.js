const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

// 1. initialize a session object

var OV;
var session;


// 2. Get token from server (openvidu-node-client)
getToken((token) => {
    OV = new OpenVidu();
    session = OV.initSession();
    
    session.on('streamCreated', (event) => {
        var subscriber = session.subscribe(event.stream, 'undefined');
        subscriber.addVideoElement(document.getElementById("publisher-stream"));
        subscriber.on('videoElementCreated', (event) => {
            /* event.element.setAttribute("muted", "true");
            event.element.play() */ // TODO: get run smoothly with https://goo.gl/xX8pDD
        });
    });
    
    session.on('streamDestroyed', (event) => {
        // Delete the HTML element with the user's name and nickname
        console.log(`streamDestroyed event fired: ${event}`);
    });

    // 3. Then by calling session.connect method you can join a properly initialized session.
    session.connect(token)
        .catch(error => {
            console.log("There was an error connecting to the session:", error.code, error.message);
        });

});



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

function getToken(callback) {
    sessionName = urlParams.get("sessionName"); // Video-call chosen by the user

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