'use strict';

const FROM_PHONE = process.env.FROM_PHONE || '+13232838412'
const TO_PHONE = process.env.TO_PHONE || '+13472325208'
const PORT = process.env.PORT || 8080

// from https://www.twilio.com/console
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC639f15cbddff570d6a04e7e3b7eb86bf'
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

// Boilerplate setup
let ApiAiAssistant = require('actions-on-google').ApiAiAssistant
let express = require('express')
let bodyParser = require('body-parser')

let app = express()
app.set('port', PORT)
app.use(bodyParser.json({type: 'application/json'}))

// -------- START Twilio -------------
let TwilioFactory = () => {
	var twilio = require('twilio')
	if (TWILIO_AUTH_TOKEN == null) {
		console.log("process.env.TWILIO_AUTH_TOKEN missing")
		return
	}
	var client = new twilio.RestClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
	return client
}

let sendSMS = (body, mediaUrl) => {
	console.log("sendSMS: %s", body)
	let client = TwilioFactory()
	if (client == null) return
	let msg = {
	    body: body,
	    to: TO_PHONE,  // Text this number
	    from: FROM_PHONE // From a valid Twilio number
	}
	if (mediaUrl) {
		msg.mediaUrl = mediaUrl
	}
	client.messages.create(msg, (err, message) => {
	    console.log(err);
	})
}
// -------- END Twilio -------------


// -------- START API.AI -------------
app.post('/caruso-concierge', (request, response) => {
	const assistant = new ApiAiAssistant({request: request, response: response})
	console.log(assistant.getIntent())


	console.log(request.body.result.fulfillment)

	let actionMap = new Map();
	actionMap.set('input.unknown', (assistant) => {
		let speech = "OK"
		if (request.body &&
			request.body.result &&
			request.body.result.fulfillment &&
			request.body.result.fulfillment.messages &&
			request.body.result.fulfillment.messages[0] &&
			request.body.result.fulfillment.messages[0].speech) {
				speech = request.body.result.fulfillment.messages[0].speech
			}
		sendSMS('Concierge Request: '+ request.body.result.resolvedQuery)
		assistant.tell(speech)
	})

	assistant.handleRequest(actionMap);
});
// -------- END API.AI -------------


app.use(express.static('public'))

// Start the server
let server = app.listen(app.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});

var io = require('socket.io')(server);
var nsp = io.of("/dispatch")
nsp.on('connection', function (socket) {
	socket.on("action", function (message) {
		if (message.source && message.type) {
			nsp.emit("action", message)
		}
		// try using redux to monitor state?

		// if (message.type == 'SEND_SMS') {
		// 	console.log(message)
		// 	sendSMS(message.body, "mediaUrl" in message ? message.mediaUrl : null)
		// 	if ("intent" in message && message.intent) {
		// 		SESSION.intentStack = [message.intent]
		// 	} else {
		// 		SESSION.intentStack = []
		// 	}
		// }
		// if (message.type == 'SET_TARGET_PHONE') {
		// 	SESSION.targetPhone = message.targetPhone
		// }
	})
})
