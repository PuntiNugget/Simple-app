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
// MODIFIED: Replaced IP-based map with a username-based Set
const bannedUsernames = new Set(); // Stores lowercase usernames
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
    if (!name) return null;
    for (const client of wss.clients) {
        // Check if client is logged in and username matches
        if (client.isLoggedIn && client.username.toLowerCase() === name.toLowerCase()) {
            return client;
        }
    }
    return null;
}

/**
 * Checks if a username is already in use by a connected, logged-in client.
 * @param {string} name The username to check.
 * @returns {boolean} True if the name is taken, false otherwise.
 */
function isUsernameTaken(name) {
    return !!findClientByName(name);
}

/**
 * Broadcasts a JSON message to all connected clients.
 * @param {object} messageObject The object to stringify and send.
 * @param {import('ws')} [sender] The client who sent the message (to exclude).
 */
function broadcast(messageObject, sender) { // <-- ADD THE 'sender' PARAMETER
    const messageString = JSON.stringify(messageObject);
    wss.clients.forEach((client) => {
        // MODIFIED: Only broadcast to logged-in users AND NOT the sender
        if (client !== sender && client.readyState === client.OPEN && client.isLoggedIn) {
            client.send(messageString);
        }
    });
}

/**
 * Broadcasts a message to all *admin* clients.
 * @param {object} messageObject The object to stringify and send.
 */
function broadcastToAdmins(messageObject) {
    const messageString = JSON.stringify(messageObject);
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN && client.isAdmin) {
            client.send(messageString);
        }
    });
}

/**
 * Sends the current banned word list to a specific client.
 * @param {import('ws')} client The WebSocket client.
 */
function sendBannedWordList(client) {
    client.send(JSON.stringify({
        type: 'bannedWordList',
        words: Array.from(bannedWords)
    }));
}

/**
 * MODIFIED: Sends the current banned *username* list to a specific client.
 * @param {import('ws')} client The WebSocket client.
 */
function sendBannedUserList(client) {
    const users = Array.from(bannedUsernames).map(name => ({ username: name }));
    client.send(JSON.stringify({
        type: 'bannedUserList',
        users: users
    }));
}

/**
 * Broadcasts the updated banned user list to all connected admins.
 */
function broadcastBannedUserList() {
    const users = Array.from(bannedUsernames).map(name => ({ username: name }));
    broadcastToAdmins({
        type: 'bannedUserList',
        users: users
    });
}


// --- WebSocket Connection Handling ---

wss.on('connection', (ws) => {
    console.log('Client connected');

    // --- MODIFIED: Connection Logic ---
    // User is NOT logged in yet.
    // We don't use IP, so no IP ban check.

    // Assign a unique ID for mute/warn tracking
    ws.id = crypto.randomUUID();
    ws.isLoggedIn = false; // NEW: User must log in first
    ws.isAdmin = false;
    ws.username = 'Anonymous'; // Default until they log in

    // Handle messages from this client
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error('Failed to parse message:', message);
            return;
        }

        // --- MODIFIED: Message routing ---
        // Allow 'setName' and 'adminLogin' before being logged in
        if (!ws.isLoggedIn && !['setName', 'adminLogin'].includes(data.type)) {
            // Ignore messages from non-logged-in users
            return;
        }

        switch (data.type) {
            // --- MODIFIED: 'setName' is now the JOIN/LOGIN logic ---
            case 'setName':
                const newName = data.name.trim();

                // Validation checks
                if (!newName || newName.length < 3 || newName.length > 20) {
                    ws.send(JSON.stringify({ type: 'joinError', text: 'Name must be 3-20 characters.' }));
                    return;
                }
                if (newName.toLowerCase() === 'you') {
                    ws.send(JSON.stringify({ type: 'joinError', text: 'That name is not allowed.' }));
                    return;
                }
                
                // Check if banned
                if (bannedUsernames.has(newName.toLowerCase())) {
                    ws.send(JSON.stringify({ type: 'banned', link: UNBAN_LINK }));
                    ws.close();
                    return;
                }
                
                // Check if name is taken
                if (isUsernameTaken(newName)) {
                    ws.send(JSON.stringify({ type: 'joinError', text: 'Username is already taken.' }));
                    return;
                }

                // --- Login / Name Change Logic ---
                if (!ws.isLoggedIn) {
                    // This is a NEW user joining
                    ws.username = newName;
                    ws.isLoggedIn = true;
                    // Send success message to this client
                    ws.send(JSON.stringify({ type: 'joinSuccess', text: 'You are now connected.' }));
                    // Announce join to OTHERS
                    broadcast({
                        type: 'system',
                        text: `${ws.username} has joined the chat.`
                    });
                } else {
                    // This is an EXISTING user changing their name
                    const oldName = ws.username;
                    ws.username = newName;
                    broadcast({
                        type: 'system',
                        text: `${oldName} is now known as ${ws.username}.`
                    });
                }
                break;

           case 'message':
                // Check for mutes
                if (mutedUsers.has(ws.id)) {
                    ws.send(JSON.stringify({ type: 'system', text: 'You are muted and cannot send messages.' }));
                    break;
                }

                // Check for banned words
                const messageText = data.text;
                const containsBannedWord = Array.from(bannedWords).some(word => messageText.toLowerCase().includes(word.toLowerCase()));

                if (containsBannedWord) {
                    ws.send(JSON.stringify({ type: 'system', text: 'Your message was blocked for containing a banned word.' }));
                    // Optional: increase warning count
                    break;
                }

                // Broadcast the message
                broadcast({
                    type: 'message',
                    name: ws.username,
                    text: messageText
                }, ws); // <-- ADD THE 'ws' ARGUMENT HERE
                break;

                // Broadcast the message
                broadcast({
                    type: 'message',
                    name: ws.username,
                    text: messageText
                });
                break;

            case 'adminLogin':
                if (data.password === ADMIN_PASSWORD) {
                    ws.isAdmin = true;
                    ws.send(JSON.stringify({ type: 'adminSuccess' }));
                    // Send them the current moderation state
                    sendBannedWordList(ws);
                    sendBannedUserList(ws); // MODIFIED
                } else {
                    ws.send(JSON.stringify({ type: 'system', text: 'Admin login failed.' }));
                }
                break;
            
            // --- Admin Actions (mostly unchanged, but target 'name') ---
            case 'adminBroadcast':
                if (!ws.isAdmin) break;
                broadcast({ type: 'system', text: `[BROADCAST] ${data.text}` });
                break;

            case 'adminWarn':
                if (!ws.isAdmin) break;
                const clientToWarn = findClientByName(data.name);
                if (clientToWarn) {
                    let count = (warningCounts.get(clientToWarn.id) || 0) + 1;
                    warningCounts.set(clientToWarn.id, count);
                    clientToWarn.send(JSON.stringify({ type: 'system', text: `[WARNING] You have been warned by an admin. (Total: ${count})` }));
                    ws.send(JSON.stringify({ type: 'system', text: `Warned ${clientToWarn.username}.` }));
                } else {
                    ws.send(JSON.stringify({ type: 'system', text: `User ${data.name} not found.` }));
                }
                break;

            case 'adminMute':
                if (!ws.isAdmin) break;
                const clientToMute = findClientByName(data.name);
                if (clientToMute) {
                    if (mutedUsers.has(clientToMute.id)) {
                         ws.send(JSON.stringify({ type: 'system', text: `${clientToMute.username} is already muted.` }));
                         break;
                    }
                    const muteDuration = 5 * 60 * 1000; // 5 minutes
                    const timeoutId = setTimeout(() => {
                        mutedUsers.delete(clientToMute.id);
                        clientToMute.send(JSON.stringify({ type: 'system', text: 'You are no longer muted.' }));
                    }, muteDuration);
                    mutedUsers.set(clientToMute.id, timeoutId);
                    clientToMute.send(JSON.stringify({ type: 'system', text: '[MOD] You have been muted for 5 minutes.' }));
                    ws.send(JSON.stringify({ type: 'system', text: `Muted ${clientToMute.username} for 5 minutes.` }));
                } else {
                    ws.send(JSON.stringify({ type: 'system', text: `User ${data.name} not found.` }));
                }
                break;

            // --- MODIFIED: 'adminBan' ---
            case 'adminBan':
                if (!ws.isAdmin) break;
                const nameToBan = data.name.toLowerCase();
                if (bannedUsernames.has(nameToBan)) {
                    ws.send(JSON.stringify({ type: 'system', text: `User ${data.name} is already banned.` }));
                    break;
                }

                // Add to ban list
                bannedUsernames.add(nameToBan);
                broadcastBannedUserList(); // Update all admins

                // Check if user is online and kick them
                const clientToBan = findClientByName(data.name);
                if (clientToBan) {
                    clientToBan.send(JSON.stringify({ type: 'banned', link: UNBAN_LINK }));
                    clientToBan.close();
                    broadcast({ type: 'system', text: `${clientToBan.username} has been banned.` });
                } else {
                    // User is offline, but now banned
                    ws.send(JSON.stringify({ type: 'system', text: `User ${data.name} is now banned (offline).` }));
                }
                break;

            // --- MODIFIED: 'adminUnban' ---
            case 'adminUnban':
                if (!ws.isAdmin) break;
                const nameToUnban = data.name.toLowerCase();
                
                if (bannedUsernames.has(nameToUnban)) {
                    bannedUsernames.delete(nameToUnban);
                    broadcastBannedUserList(); // Update all admins
                    ws.send(JSON.stringify({ type: 'system', text: `Unbanned user ${data.name}.` }));
                } else {
                    ws.send(JSON.stringify({ type: 'system', text: `User ${data.name} is not on the ban list.` }));
                }
                break;

            case 'adminAddWord':
                if (!ws.isAdmin) break;
                bannedWords.add(data.word.toLowerCase());
                broadcastToAdmins({ type: 'bannedWordList', words: Array.from(bannedWords) });
                ws.send(JSON.stringify({ type: 'system', text: `Added word: ${data.word}` }));
                break;
                
            case 'adminRemoveWord':
                if (!ws.isAdmin) break;
                bannedWords.delete(data.word.toLowerCase());
                broadcastToAdmins({ type: 'bannedWordList', words: Array.from(bannedWords) });
                ws.send(JSON.stringify({ type: 'system', text: `Removed word: ${data.word}` }));
                break;
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        console.log('Client disconnected');
        
        // Clear any mute timeouts
        if (mutedUsers.has(ws.id)) {
            clearTimeout(mutedUsers.get(ws.id));
            mutedUsers.delete(ws.id);
        }
        // Clear warning counts
        warningCounts.delete(ws.id);

        // MODIFIED: Only broadcast leave if they were logged in
        if (ws.isLoggedIn) {
            broadcast({
                type: 'system',
                text: `${ws.username} has left the chat.`
            });
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket Error:', error.message);
    });
});

// --- Express Route ---
// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// --- Start the Server ---
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
