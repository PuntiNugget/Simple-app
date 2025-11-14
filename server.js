// Import required libraries
const express = require('express');
const http = require('http');
const path = require('path');
const { Server: WebSocketServer } = require('ws');
const crypto = require('crypto'); // Used for generating unique user IDs

// Set up the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set the port
const PORT = process.env.PORT || 3000;

// --- Admin Password (for demonstration) ---
const ADMIN_PASSWORD = 'admin123';
const UNBAN_LINK = 'https://forms.gle/cHmhaYYk1eAdFvpJA';

// --- Moderation State (in-memory) ---
// In a real app, you might store these in a database
const bannedUsers = new Map(); // Stores ip -> { username, banDate }
const bannedWords = new Set(['examplebadword1', 'examplebadword2']);
const mutedUsers = new Map(); // Stores ws.id -> timeoutID
const warningCounts = new Map(); // Stores ws.id -> count

// --- WebSocket Server Setup ---
// We pass 'server' to the WebSocketServer
const wss = new WebSocketServer({ server });

/**
 * Finds a connected client by their username (case-insensitive).
 * @param {string} name The username to search for.
 * @returns {import('ws') | null} The WebSocket client or null if not found.
 */
function findClientByName(name) {
    for (const client of wss.clients) {
        if (client.username.toLowerCase() === name.toLowerCase()) {
            return client;
        }
    }
    return null;
}

/**
 * Broadcasts a JSON message to all connected clients.
 * @param {object} messageObject The object to stringify and send.
 */
function broadcast(messageObject) {
    const messageString = JSON.stringify(messageObject);
    wss.clients.forEach((client) => {
        // Check if client is still open
        if (client.readyState === client.OPEN) {
            client.send(messageString);
        }
    });
}

/**
 * Broadcasts a JSON message to all clients *except* the sender.
 * @param {import('ws')} senderWs The WebSocket connection of the sender.
 * @param {object} messageObject The object to stringify and send.
 */
function broadcastToOthers(senderWs, messageObject) {
    const messageString = JSON.stringify(messageObject);
    wss.clients.forEach((client) => {
        if (client !== senderWs && client.readyState === client.OPEN) {
            client.send(messageString);
        }
    });
}

/**
 * Sends a list of all currently banned words to all admins.
 */
function broadcastBannedWordList() {
    const wordList = JSON.stringify({
        type: 'bannedWordList',
        words: Array.from(bannedWords)
    });
    wss.clients.forEach((client) => {
        if (client.isAdmin && client.readyState === client.OPEN) {
            client.send(wordList);
        }
    });
}

/**
 * Sends a list of all currently banned users to all admins.
 */
function broadcastBannedUserList() {
    // Convert map to an array for JSON serialization
    const userList = Array.from(bannedUsers.entries()).map(([ip, data]) => ({
        ip,
        username: data.username,
        banDate: data.banDate
    }));

    const message = JSON.stringify({
        type: 'bannedUserList',
        users: userList
    });

    wss.clients.forEach((client) => {
        if (client.isAdmin && client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}

// WebSocket connection logic
// We get 'req' (the HTTP request) here to access the IP address
wss.on('connection', (ws, req) => {
    
    // Get the client's IP address. 
    // 'x-forwarded-for' is important for services like Render (proxies).
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket.remoteAddress;
    
    // --- IP Ban Check ---
    if (bannedUsers.has(ip)) {
        console.log(`Banned IP ${ip} tried to connect.`);
        // Send the ban message with the link, then close
        ws.send(JSON.stringify({
            type: 'banned',
            link: UNBAN_LINK
        }));
        ws.close();
        return; // Stop processing this connection
    }

    console.log(`Client connected from IP: ${ip}`);
    
    // --- Store user data on the WebSocket object itself ---
    ws.id = crypto.randomUUID(); // Unique ID for this session
    ws.ip = ip;
    ws.username = 'Anonymous';
    ws.isAdmin = false;
    warningCounts.set(ws.id, 0);

    // Send a welcome message to the newly connected client
    ws.send(JSON.stringify({
        type: 'system',
        text: 'You are connected! You can set your name in the Settings.'
    }));

    // Announce the new user to everyone else
    broadcastToOthers(ws, {
        type: 'system',
        text: 'Anonymous has joined the chat.'
    });

    // Handle messages received from a client
    ws.on('message', (message) => {
        let data;
        
        try {
            data = JSON.parse(message.toString());
        } catch (e) {
            console.error('Failed to parse message or invalid JSON:', e);
            return;
        }

        // Use a switch to handle different message types
        switch (data.type) {
            case 'message':
                // A standard chat message
                console.log(`Message from ${ws.username}: ${data.text}`);
                broadcastToOthers(ws, {
                    type: 'message',
                    name: ws.username,
                    text: data.text
                });
                break;
            
            case 'setName':
                // A user is setting their name
                const oldName = ws.username;
                ws.username = data.name.trim().slice(0, 25) || 'Anonymous'; // Limit name length
                console.log(`User ${oldName} is now ${ws.username}`);
                broadcast({
                    type: 'system',
                    text: `${oldName} is now known as ${ws.username}.`
                });
                break;

            case 'adminLogin':
                // A user is trying to log in as admin
                if (data.password === ADMIN_PASSWORD) {
                    ws.isAdmin = true;
                    console.log(`User ${ws.username} logged in as admin.`);
                    ws.send(JSON.stringify({ type: 'adminSuccess' }));
                    // Send them the current list of banned words
                    ws.send(JSON.stringify({
                        type: 'bannedWordList',
                        words: Array.from(bannedWords)
                    }));
                    // Send them the current list of banned users
                    broadcastBannedUserList();
                } else {
                    console.log(`User ${ws.username} failed admin login.`);
                    ws.send(JSON.stringify({ type: 'system', text: 'Admin login failed.' }));
                }
                break;
            
            // --- New Admin Commands ---

            case 'adminBroadcast':
                if (ws.isAdmin) {
                    broadcast({ type: 'system', text: `[ADMIN] ${data.text}` });
                }
                break;
            
            case 'adminWarn':
                if (ws.isAdmin) {
                    const clientToWarn = findClientByName(data.name);
                    if (clientToWarn) {
                        const newCount = (warningCounts.get(clientToWarn.id) || 0) + 1;
                        warningCounts.set(clientToWarn.id, newCount);
                        
                        clientToWarn.send(JSON.stringify({
                            type: 'system',
                            text: `You have been warned by an admin. (Warning ${newCount} of 3)`
                        }));
                        broadcast({
                            type: 'system',
                            text: `${clientToWarn.username} has been warned by an admin.`
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'system', text: `User '${data.name}' not found.`}));
                    }
                }
                break;
            
            case 'adminMute':
                if (ws.isAdmin) {
                    const clientToMute = findClientByName(data.name);
                    if (clientToMute) {
                        mutedUsers.set(clientToMute.id, setTimeout(() => {
                            mutedUsers.delete(clientToMute.id);
                            clientToMute.send(JSON.stringify({ type: 'system', text: 'You are no longer muted.' }));
                        }, 300000)); // 5 minutes

                        clientToMute.send(JSON.stringify({ type: 'system', text: 'You have been muted for 5 minutes.' }));
                        broadcast({
                            type: 'system',
                            text: `${clientToMute.username} has been muted.`
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'system', text: `User '${data.name}' not found.`}));
                    }
                }
                break;

            case 'adminBan':
                if (ws.isAdmin) {
                    const clientToBan = findClientByName(data.name);
                    if (clientToBan) {
                        // Ban their IP and store their username
                        bannedUsers.set(clientToBan.ip, { 
                            username: clientToBan.username, 
                            banDate: Date.now() 
                        });
                        console.log(`Banning user ${clientToBan.username} with IP ${clientToBan.ip}`);
                        
                        broadcast({
                            type: 'system',
                            text: `${clientToBan.username} has been banned.`
                        });
                        
                        clientToBan.send(JSON.stringify({ type: 'banned', link: UNBAN_LINK }));
                        clientToBan.close();
                        broadcastBannedUserList(); // Update all admins
                    } else {
                        ws.send(JSON.stringify({ type: 'system', text: `User '${data.name}' not found.`}));
                    }
                }
                break;

            case 'adminUnban':
                if (ws.isAdmin) {
                    const ipToUnban = data.ip;
                    if (bannedUsers.has(ipToUnban)) {
                        const unbannedUser = bannedUsers.get(ipToUnban);
                        bannedUsers.delete(ipToUnban);
                        console.log(`Unbanning user ${unbannedUser.username} with IP ${ipToUnban}`);
                        
                        broadcast({
                            type: 'system',
                            text: `${unbannedUser.username} (IP: ${ipToUnban}) has been unbanned.`
                        });
                        broadcastBannedUserList(); // Update all admins
                    } else {
                        ws.send(JSON.stringify({ type: 'system', text: `IP '${ipToUnban}' not found in ban list.`}));
                    }
                }
                break;

            case 'adminAddWord':
                if (ws.isAdmin) {
                    const word = data.word.toLowerCase().trim();
                    if (word) {
                        bannedWords.add(word);
                        broadcastBannedWordList();
                    }
                }
                break;
            
            case 'adminRemoveWord':
                if (ws.isAdmin) {
                    bannedWords.delete(data.word.toLowerCase().trim());
                    broadcastBannedWordList();
                }
                break;

            default:
                console.warn(`Unknown message type: ${data.type}`);
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log(`Client ${ws.username} disconnected`);
        // Clean up user data
        warningCounts.delete(ws.id);
        const muteTimeout = mutedUsers.get(ws.id);
        if (muteTimeout) {
            clearTimeout(muteTimeout);
            mutedUsers.delete(ws.id);
        }
        
        broadcast({
            type: 'system',
            text: `${ws.username} has left the chat.`
        });
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('WebSocket Error:', error);
    });
});

// --- Express Server Setup ---
// Tell Express to serve files from the "public" directory.
app.use(express.static(path.join(__dirname, 'public')));


// Start the HTTP server
server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
