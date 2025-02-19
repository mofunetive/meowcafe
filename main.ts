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
    // ======================== Origin Check ========================
    const origin = req.headers.origin;
    console.log('[WebSocket] connection from origin:', origin);

    // ======================== ID Generate ========================
    const id = uuidv4();    

    ws.id = id;
	ws.isAlive = true;

    // ======================== ID Generate ========================
	clients.set(ws.id, {pos: [0, 0], "ws":ws});
	// console.log("[WebSocket] New Client Added", ws.id); 

	ws.send(JSON.stringify({type:"initial_id", id}));

    broadcast({ type: "player_joined", id: id, "pos": [0, 0]});
    console.log(`[Broadcat]: user ${id} joined`,); 

	ws.on('message', message => {
        let data = JSON.parse(message.toString());
        console.log("message in!!", data);

        if (data.type == "message") {
            broadcast({ type: "message", id, data: message });
            console.log(`[Broadcat]: message ${id}: ${message}`,); 
        } else if (data.type == "update_pos") {
            clients.get(data.id).pos = data["pos"];
            broadcast({ type: "update_pos", id:id, pos: data["pos"]});
            console.log(`[Broadcat]: update_pos ${id}: ${data["pos"]}`,); 
        }
    });

    ws.on("close", (message) => {
        clients.delete(ws.id);
        broadcast({ type: "player_leaved", id: ws.id})
        console.log("User Disconnected")
    });

    ws.on("error", console.error);
});

const broadcast = (data : object) =>{
    const jsonData = JSON.stringify(data);

    for (let [_, value] of clients) {
        if (value.ws.readyState === WebSocket.OPEN) {
            value.ws.send(jsonData);
        }
    }

}

// const interval = setInterval(() => {
//     for (let [key, value] of clients) {
//         if (value.ws.isAlive === false){
//             let user_id = value.ws.id

//             console.log(user_id," is dead");
            
//             clients.delete(user_id);
//             return value.ws.terminate();
//         } else {
//             value.ws.isAlive = false;
//             value.ws.send(JSON.stringify({"command":"ping", "val":value.ws.id}));
//         }
//     }
// }, 30000);

const packClients = () => {
	let pack = new Map();
	for (const [key, value] of clients){
		pack.set(key, {"pos":value.pos,"user":value.user,"col":value.col});
	}
	return pack;
}