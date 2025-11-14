<!DOCTYPE html>
<!-- The 'dark' class will be dynamically added/removed by JS -->
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Node.js Chat</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            // Enable 'class' strategy for dark mode
            darkMode: 'class', 
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                },
            },
        }
    </script>
    <style>
        /* Light mode scrollbar */
        #chat-messages::-webkit-scrollbar {
            width: 6px;
        }
        #chat-messages::-webkit-scrollbar-thumb {
            background-color: #cbd5e1; /* gray-300 */
            border-radius: 3px;
        }
        #chat-messages::-webkit-scrollbar-track {
            background-color: #f1f5f9; /* gray-100 */
        }

        /* Dark mode scrollbar */
        .dark #chat-messages::-webkit-scrollbar-thumb {
            background-color: #4b5563; /* gray-600 */
        }
        .dark #chat-messages::-webkit-scrollbar-track {
            background-color: #374151; /* gray-700 */
        }

        /* Simple CSS for the toggle switch */
        .toggle-checkbox:checked + .toggle-label {
            background-color: #3b82f6; /* blue-500 */
        }
        .toggle-checkbox:checked + .toggle-label .toggle-ball {
            transform: translateX(1.25rem); /* 20px */
        }
    </style>
</head>
<!-- 
  The body classes are now minimal. 
  The dark/light background is applied to the <html> tag by the script.
-->
<body class="font-sans h-full flex items-center justify-center transition-colors duration-300 bg-gray-100 dark:bg-gray-900">

    <div class="flex flex-col h-[90vh] w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl rounded-lg overflow-hidden">
        <!-- Header -->
        <header class="bg-blue-600 dark:bg-blue-700 text-white p-4 flex justify-between items-center">
            <h1 class="text-2xl font-bold">Node.js + WebSocket Chat</h1>
            <!-- Settings Button (Gear Icon) -->
            <button id="open-settings-btn" class="p-2 rounded-full hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.573-1.066z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </button>
        </header>

        <!-- Chat Messages -->
        <main id="chat-messages" class="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50 dark:bg-gray-700">
            <!-- Messages will be dynamically injected here -->
            <div class="p-2 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded-lg text-sm">
                Connecting to chat server...
            </div>
        </main>

        <!-- Message Input Form -->
        <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <form id="message-form" class="flex space-x-3">
                <input 
                    type="text" 
                    id="message-input"
                    placeholder="Type your message..."
                    autocomplete="off"
                    class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-gray-400"
                    required
                >
                <button 
                    type="submit" 
                    id="send-button"
                    class="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    Send
                </button>
            </form>
        </footer>
    </div>

    <!-- Settings Modal (Initially Hidden) -->
    <div id="settings-modal" class="fixed inset-0 z-10 overflow-y-auto hidden">
        <!-- Overlay -->
        <div id="settings-overlay" class="fixed inset-0 bg-black bg-opacity-50"></div>

        <!-- Modal Panel -->
        <div class="relative bg-white dark:bg-gray-800 w-full max-w-md mx-auto my-20 p-6 rounded-lg shadow-xl z-20">
            <!-- Modal Header -->
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
                <button id="close-settings-btn" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="space-y-4">
                <!-- Dark Mode Toggle -->
                <div class="flex items-center justify-between">
                    <span class="text-gray-700 dark:text-gray-300">Dark Mode</span>
                    <label for="dark-mode-toggle" class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="dark-mode-toggle" class="sr-only toggle-checkbox">
                        <div class="toggle-label w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full transition-colors">
                            <div class="toggle-ball w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out"></div>
                        </div>
                    </label>
                </div>
                
                <!-- More settings can be added here -->

            </div>
        </div>
    </div>


    <!-- Client-side JavaScript -->
    <script>
        // --- DOM Elements ---
        const chatMessages = document.getElementById('chat-messages');
        const messageForm = document.getElementById('message-form');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        // --- Settings Modal Elements ---
        const settingsModal = document.getElementById('settings-modal');
        const settingsOverlay = document.getElementById('settings-overlay');
        const openSettingsBtn = document.getElementById('open-settings-btn');
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        
        // --- Dark Mode Elements ---
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const htmlElement = document.documentElement; // The <html> tag

        // --- Dark Mode Logic ---

        // 1. Check local storage on page load
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            htmlElement.classList.add('dark');
            darkModeToggle.checked = true;
        } else {
            htmlElement.classList.remove('dark');
            darkModeToggle.checked = false;
        }

        // 2. Add event listener to toggle
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                htmlElement.classList.add('dark');
                localStorage.theme = 'dark';
            } else {
                htmlElement.classList.remove('dark');
                localStorage.theme = 'light';
            }
        });

        // --- Settings Modal Logic ---
        function openModal() {
            settingsModal.classList.remove('hidden');
        }
        function closeModal() {
            settingsModal.classList.add('hidden');
        }

        openSettingsBtn.addEventListener('click', openModal);
        closeSettingsBtn.addEventListener('click', closeModal);
        settingsOverlay.addEventListener('click', closeModal);


        // --- WebSocket Connection ---
        
        // Determine the WebSocket protocol. 'ws://' for http, 'wss://' for https
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        // Connect to the WebSocket server at the same host and port
        const ws = new WebSocket(wsProtocol + window.location.host);

        // --- Helper Function ---
        function displayMessage(message, isMe = false) {
            const messageElement = document.createElement('div');
            messageElement.textContent = message;
            
            // Style the message
            messageElement.classList.add('p-2', 'rounded-lg', 'max-w-xs', 'break-words');
            
            if (isMe) {
                // My messages (sent from this client)
                // Note: We don't need dark mode classes here, blue-500 works on both.
                messageElement.classList.add('bg-blue-500', 'text-white', 'self-end', 'ml-auto');
            } else {
                // Others' messages (received from server)
                // We update this to support dark mode
                messageElement.classList.add('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-gray-200', 'self-start');
            }

            chatMessages.appendChild(messageElement);
            // Auto-scroll to the bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // --- WebSocket Event Handlers ---

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
            // Clear the "connecting" message
            chatMessages.innerHTML = ''; 
            displayMessage('You are connected!', false);
        };

        ws.onmessage = (event) => {
            // When a message is received from the server, display it
            console.log('Message from server:', event.data);
            displayMessage(event.data, false);
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
            displayMessage('You have been disconnected.', false);
            sendButton.disabled = true;
            messageInput.disabled = true;
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            displayMessage('Connection error.', false);
        };

        // --- Form Submission Handler ---
        messageForm.addEventListener('submit', (event) => {
            // Prevent the default form submission (which reloads the page)
            event.preventDefault();

            const message = messageInput.value;

            if (message && ws.readyState === WebSocket.OPEN) {
                // Send the message to the WebSocket server
                ws.send(message);
                
                // We'll let the server broadcast it back to us
                // This confirms the message was sent and received by the server
                // displayMessage(message, true); // Optionally, display it immediately

                // Clear the input field
                messageInput.value = '';
            }
        });

    </script>
</body>
</html>
