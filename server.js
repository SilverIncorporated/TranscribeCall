require("dotenv").config();
const { log } = require("console");
const TwilioSocket = require("./TwilioSocket");
const TranscriptionService = require("./TranscriptionService");
const TwilioSocketConnection = TwilioSocket.TwilioSocketConnection;
const TextToSpeech = require("./TextToSpeechService");
const wavefile = require('wavefile');
const ListenerSocket = require('./ListenerSocket')
const Listener = ListenerSocket.Listenersocket
const GPTPlugin = require('./GPTPlugin')
const ChatGPT = GPTPlugin.GPTPlugin;
const {encode, decode} = require('gpt-3-encoder')

var webSocketServer = new (require('ws')).Server({port: (process.env.PORT)});

listenerSockets = {};
gsClientInbound = null;
twilioSocket = null;
const gpt = new ChatGPT();

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
      Respond("Introduce yourself")
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
function BroadcastListeners(event, content) {
  for ( let key in listenerSockets ) {
    listenerSockets[key].writeMessage(msg.event, msg.content);
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
async function Respond(text) {
  log(`User: ${text}`);
  var tokens = encode(text);
  BroadcastListeners('transcription', {
      role:'user',
      tokens:tokens
    });

  var response = await gpt.GenerateResponse(text);

  var tokens = encode(response);
  BroadcastListeners('transcription', {
    role:'assistant',
    tokens:tokens
  });
  SayAudio(response);
}