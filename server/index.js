const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (socket) => {
  socket.on('message', (message) => {
    const parsedMessage = JSON.parse(message);

    // Broadcast to all other clients
    wss.clients.forEach((client) => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(parsedMessage));
      }
    });
  });
});

const PORT =  8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
