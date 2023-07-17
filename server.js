require("dotenv").config();
const { log } = require("console");
const sockets = require("./Sockets");
const TranscriptionService = require("./transcriptionService");
const TwilioSocketConnection = sockets.TwilioSocketConnection;
const TextToSpeech = require("./textToSpeechService");
const wavefile = require('wavefile');

var webSocketServer = new (require('ws')).Server({port: (3000)});

const req = require("express/lib/request");
var fs = require("fs");

listenerSockets = {};
gsClientInbound = null;
twilioSocket = null;

log("Starting websocket server...");

// CONNECT <baseUrl>/<role>?serviceId=<string>
// EXAMPLE wss://www.socket.io/listener?serviceId=Listener1
webSocketServer.on('connection', (ws, req) => {

  try {

    switch (req.url) {
      case "/twilio/inbound":
        log("Twilio inbound stream connecting...");
        twilioSocket = new TwilioSocketConnection(ws, req);
        gsClientInbound = new TranscriptionService();
        gsClientInbound.on("transcription", (transcription) => {
          HandleTranscription(transcription);
        })

        twilioSocket.on("message", (msg) => TranscribeMessage(msg));

        twilioSocket.on('close', CloseTwilioSocket);

        break;
    
      default:
        break;
    }
  }
  catch(error) {
    log("Failed to connect socket!\n" + error.message);
  }
})

function TranscribeMessage(message) {
  //log("Transcribing message...")
  //log(message)
  gsClientInbound.send(message.media.payload);
}

async function HandleTranscription(message){
  log(message);
  var response = await GetResponseAudio(message);

  if(twilioSocket) {

    var say = new wavefile.WaveFile(response);

    say.toBitDepth('8');
    say.toSampleRate(8000);
    say.toMuLaw();

    var payload = Buffer.from(say.data.samples).toString('base64');

    var mediaMessage = {
      event: 'media',
      streamSid: twilioSocket.streamSid,
      media: {
        payload
      }
    };

    var msgJson = JSON.stringify(mediaMessage);

    twilioSocket.socket.send(msgJson);
  }
}

function CloseTwilioSocket() {
  log('Twilio lane closing...')
  twilioSocket = null;
  gsClientInbound.close();
}

async function GetResponseAudio(text) {
  return await TextToSpeech(text, 'en-US', 'NEUTRAL');
}