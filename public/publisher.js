// @ts-nocheck

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

// 1. initialize a session object

var OV;
var session;

// 2. Get token from server (openvidu-node-client)
getToken((token) => {

	OV = new OpenVidu();
	session = OV.initSession();
	
	// 3. Then by calling session.connect method you can join a properly initialized session.
	session.connect(token, urlParams.get("sessionName"))
		.then(() => {

			var publisher = OV.initPublisher("publisher-element", {
				audioSource: undefined, // The source of audio. If undefined default microphone
				videoSource: undefined, // The source of video. If undefined default webcam
				publishAudio: true,  	// Whether you want to start publishing with your audio unmuted or not
				publishVideo: true,  	// Whether you want to start publishing with your video enabled or not
				resolution: '640x480',  // The resolution of your video
				frameRate: 30,			// The frame rate of your video
				insertMode: 'APPEND',	// How the video is inserted in the target element 'video-container'
				mirror: false       	// Whether to mirror your local video or not
			},
				(error) => {                // Function to be executed when the method finishes
					if (error) {
						console.error('Error while initializing publisher: ', error);
					} else {
						console.log('Publisher successfully initialized');
						session.publish(publisher);
						// Method Session.publish must always be called after successfully connecting to session
					}
				});
			// Register all the events you want with 'publisher.on(...)'

		})
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
	sessionName = urlParams.get("sessionName") // Video-call chosen by the user

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