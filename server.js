const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let waitingUser = null;

let onlineUsers = 0;

wss.on('connection', ws => {

    onlineUsers++;

broadcastOnlineUsers();

    console.log('User connected');

    console.log('WAITING USER:', waitingUser ? 'YES' : 'NO');

    if(waitingUser){

        ws.partner = waitingUser;
        waitingUser.partner = ws;

        ws.send(JSON.stringify({
            type:'matched',
            initiator:false
        }));

        waitingUser.send(JSON.stringify({
            type:'matched',
            initiator:true
        }));

        waitingUser = null;

    }else{

        waitingUser = ws;

        ws.send(JSON.stringify({
            type:'waiting'
        }));

    }

    /*
    RECEIVE MESSAGE
    */

    ws.on('message', message => {

    const data = JSON.parse(message);

    if(data.type === 'next') {

        if(ws.partner) {

            ws.partner.send(JSON.stringify({
                type: 'partner-disconnected'
            }));

            ws.partner.partner = null;
            ws.partner = null;
        }
    }

   if(
    ws.partner &&
    ws.partner.readyState === WebSocket.OPEN &&
    data.type !== 'next'
){
    ws.partner.send(message.toString());
}
    
    if(waitingUser){

        ws.partner = waitingUser;
        waitingUser.partner = ws;

        ws.send(JSON.stringify({
            type:'matched',
            initiator:true
        }));

        waitingUser.send(JSON.stringify({
            type:'matched',
            initiator:false
        }));

        waitingUser = null;

    }else{

        waitingUser = ws;

        ws.send(JSON.stringify({
            type:'waiting'
        }));

    }

    return;

        if(ws.partner && ws.partner.readyState === WebSocket.OPEN){

            ws.partner.send(message.toString());

        }

    });

    /*
    DISCONNECT
    */

    ws.on('close', () => {

        onlineUsers--;

broadcastOnlineUsers();

        console.log('User disconnected');

        if(ws.partner){

            ws.partner.send(JSON.stringify({
                type:'partner-disconnected'
            }));

            ws.partner.partner = null;

        }

        if(waitingUser === ws){

            waitingUser = null;

        }

    });

function broadcastOnlineUsers(){

    wss.clients.forEach(client => {

        if(client.readyState === WebSocket.OPEN){

            client.send(JSON.stringify({

                type:'online-count',
                count:onlineUsers

            }));

        }

    });

}

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});