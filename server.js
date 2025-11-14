// Import required libraries
const express = require('express');
const http = require('http');
const path = require('path');
const { Server: WebSocketServer } = require('ws');

// Set up the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set the port
// Render will set the PORT environment variable, so we use that if it exists
const PORT = process.env.PORT || 3000;

// --- WebSocket Server Setup ---
// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// WebSocket connection logic
wss.on('connection', (ws) => {
    console.log('Client connected');

    // Handle messages received from a client
    ws.on('message', (message) => {
        try {
            // Convert the message (which is a Buffer) to a string
            const messageString = message.toString();

            // Log the received message
            console.log('Received: %s', messageString);

            // Broadcast the message to all connected clients
            // We loop through all clients and send them the message
            wss.clients.forEach((client) => {
                if (client.readyState === ws.OPEN) {
                    client.send(messageString);
                }
            });

        } catch (e) {
            console.error('Failed to process message:', e);
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('WebSocket Error:', error);
    });
});

// --- Express Server Setup ---
// Serve the 'index.html' file when someone visits the root URL
app.get('/', (req, res) => {
    // Send the index.html file
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
