require("dotenv").config();
const { json } = require("express/lib/response");
const { v4: uuidv4} = require("uuid");
const { log } = require("console");
const { EventEmitter } = require("stream");

module.exports = {
    Listenersocket: class Listenersocket extends EventEmitter {

        constructor(socket, request, name) {
            super();
            this.socket = socket;
            this.#request = request;
            let url = new URL(request.url, this.#baseURL);
            this.name = url.searchParams.get("name");
            this.id = uuidv4();
            let pathparts = url.pathname.split("/");
            this.name = name;
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

        writeMessage(event, content) {
            var msg = {
                event: event,
                content: content
            }
            var message = JSON.stringify(msg);
            this.socket.send(message);
        }

        processMessage(message) {
            try {
                var msg = JSON.parse(message);
                
                if(msg['event'] && msg.event === "start") {
                    log(`Listener started at ${this.name}`);
                    this.emit('start', msg);
                } 
                else if (msg['event'] && msg.event === "listFunctions") {
                    try {
                        this.emit('listFunctions', msg);
                    }
                    catch (error) {
                        log(`Listener ${this.name} failed to Emit: ${error}`)
                    }
                }
                else if (msg.event && msg.event === "echo"){
                    this.emit('echo', msg);
                }
            }
            catch (error) {
                log(`Listener ${this.name} message receive failed: ${message}\nError: ${error}`);
            }
        }
    }    
}