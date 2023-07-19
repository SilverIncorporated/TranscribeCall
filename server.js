require("dotenv").config();
const { log } = require("console");
const TwilioSocket = require("./TwilioSocket");
const TranscriptionService = require("./TranscriptionService");
const TwilioSocketConnection = TwilioSocket.TwilioSocketConnection;
const TextToSpeech = require("./TextToSpeechService");
const wavefile = require('wavefile');
const gpt = require('./GPTPlugin');
const ListenerSocket = require('./ListenerSocket')
const Listener = ListenerSocket.Listenersocket

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
    if(req.url === "/twilio/inbound"){
      log("Twilio inbound stream connecting...");
      twilioSocket = new TwilioSocketConnection(ws, req);
      gsClientInbound = new TranscriptionService();
      gsClientInbound.on("transcription", (transcription) => {
        Respond(transcription);
      })
      twilioSocket.on("message", (msg) => TranscribeMessage(msg));
      twilioSocket.on('close', CloseTwilioSocket);
    }
    else if(req.url.startsWith('/listener')) {    
      log(`Listener connected at ${req.url}`)
      var newListener = new Listener(ws, req, req.url);
      listenerSockets[newListener.id] = newListener;
      newListener.on("start", (msg) => log("Listener Attached"));
      newListener.on("listFunctions", (msg) => log(msg))
      newListener.on("close", () => CloseListener(newListener.id));
      newListener.on('echo', (msg) => BroadcastListeners(msg));
    }
  }
  catch(error) {
    log("Failed to connect socket!\n" + error.message);
  }
})
function ParseListenerMessage(msg) {

}
function BroadcastListeners(msg) {
  for ( let key in listenerSockets ) {
    listenerSockets[key].writeMessage(msg.event, "echo");
  }
}
function CloseListener(id){
  var listener = listenerSockets[id];
  listener.socket.close();
  log(`Listener ${listener.name} closed.`)
  delete listenerSockets[id];
}
function TranscribeMessage(message) {
  //log("Transcribing message...")
  //log(message)
  gsClientInbound.send(message.media.payload);
}
async function SayAudio(message){
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
async function Respond(msg) { 

  log(`User: ${msg}`);

  var response = await gpt(msg);

  log(`Agent: ${response}`)

  SayAudio(response);
}