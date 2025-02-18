import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

const app = express(); 
const server: Server = require('http').Server(app);
const port =  process.env.PORT || 4399;
const wss = new WebSocketServer({server: server});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/', express.static(__dirname + '/client'));

server.on ("error", (error: Error) => {
    console.log(`[server] Error Message ${error}`);
});
  
server.listen(port, () => {
    console.log(`[server] Listening ws-api on port ${port}`);
});

interface ExtWebSocket extends WebSocket {
    id: string;
    isAlive: boolean;
}

var clients = new Map<string, any>();

wss.on("connection", (ws: ExtWebSocket, req) => {
    ws.on("error", console.error);

    const origin = req.headers.origin;
    console.log('WebSocket connection from origin:', origin);

    const id = uuidv4();
    ws.id = id;
	ws.isAlive = true;

	clients.set(ws.id, {"pos":[0,0],"ws":ws,"col":{}});

	console.log("New Client Added ", ws.id); 

	ws.send(JSON.stringify({"command":"getID", "val": ws.id }));

	ws.on('message', message => {
            let msg_str = message.toString().replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, ''); 

            if (msg_str.indexOf('{') !== 0) {
                msg_str = msg_str.substring(msg_str.indexOf('{'))
            }

            let obj = JSON.parse(msg_str);

            if (obj.command === "ping") { 
                console.log('got ping request at: ',obj.val) 
                ws.send(JSON.stringify({"command":"pong","val": obj.val}));
            } else if (obj.command === "pong") {
                ws.isAlive = true;
            } else if (obj.command === "chat") {
                sendAll(JSON.stringify({"command":"chat", "val":obj.val}));
            } else if (obj.command === "pos") {
                console.log(clients.get(obj.id)["pos"]);
                clients.get(obj.id)["pos"] = obj.val;
                let packed = {"command": "clientPack", "val":packClients()}
                sendAll(JSON.stringify(packed));
            } else if (obj.command === "reg"){
                // New user filled out name and color
                clients.get(obj.id)["user"] = obj.user;
                clients.get(obj.id)["col"] = obj.col;
            } else {
                ws.close();
            }
        }
    );
});

const interval = setInterval(() => {
    for (let [key, value] of clients) {
        if (value.ws.isAlive === false){
            let user_id = value.ws.id

            console.log(user_id," is dead");
            
            clients.delete(user_id);
            return value.ws.terminate();
        } else {
            value.ws.isAlive = false;
            value.ws.send(JSON.stringify({"command":"ping", "val":value.ws.id}));
        }
    }
}, 30000);

const sendAll = (message: String) => {
	for (let [key, value] of clients) {
        value.ws.send(message);
    }
}

const packClients = () => {
	let pack = new Map();
	for (const [key, value] of clients){
		pack.set(key, {"pos":value.pos,"user":value.user,"col":value.col});
	}
	return pack;
}