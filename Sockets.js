require("dotenv").config();
const { json } = require("express/lib/response");
const { v4: uuidv4} = require("uuid");
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const { log } = require("console");
const { EventEmitter } = require("stream");

module.exports = {
    TwilioSocketConnection: class TwilioSocketConnection extends EventEmitter {

        constructor(socket, request, closeCallback) {
            super();
            this.socket = socket;
            this.#request = request;
            let url = new URL(request.url, this.#baseURL);
            this.name = url.searchParams.get("name");
            this.id = uuidv4();
            let pathparts = url.pathname.split("/");
            this.name = "Twilio";
            socket.on('message', (msg) => this.processMessage(msg));
            socket.on('close', () => this.emit('close'));
        }

        #baseURL = "https://www.example.com"
        socket;
        #request;
        name;
        id;
        role;
        hasSeenMedia = false;
        messages = [];
        streamSid;

        processMessage(message) {
            try {
                var msg = JSON.parse(message);
        
                //Because twilio is stupid and can't pass parameters in a url like every normal service, we pick it up from the first streamed message
                if(msg['event'] && msg.event === "start") {
                    this.name = "twilio";
                    log("Twilio start event received.");
                    this.streamSid = msg.streamSid;
                } 
                else if (msg['event'] && msg.event ==="media") {
                    if(!this.hasSeenMedia) {
                        log("Media stream received from Twilio.");
                        //log(msg);
                        log("Suppressing messages from service.");
                        this.hasSeenMedia = true;
                    }
                    try {
                        this.emit('message', msg);
                    }
                    catch (error) {
                        log("Failed to Emit: " + error)
                    }
                }

                
            }
            catch {
                log("Message failed: " + message);
            }
        }
    }    
}