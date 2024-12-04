// Establish socket connection with token
const userToken = localStorage.getItem('token');

if (userToken) {
    const decodedToken = JSON.parse(atob(userToken.split('.')[1])); 
    const isTokenExpired = Date.now() >= decodedToken.exp * 1000;

    if (isTokenExpired) {
        alert('Session expired. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
} else {
    window.location.href = '/login';
}

const socket = io('http://localhost:3000', {
    query: { token: userToken }
});

// Select elements
const setUsernameButton = document.getElementById('setUsernameButton');
const usernameInput = document.getElementById('usernameInput');
const userSection = document.getElementById('userSection');
const chatSection = document.getElementById('chatSection');
const privateMessageSection = document.getElementById('privateMessageSection');
const typingIndicator = document.getElementById('typingIndicator');
const sendButton = document.getElementById('sendButton');
const sendPrivateButton = document.getElementById('sendPrivateButton');
const messageInput = document.getElementById('messageInput');
const privateMessageInput = document.getElementById('privateMessageInput');
const recipientSelect = document.getElementById('recipientSelect');
const usersList = document.getElementById('usersList');
const messagesList = document.getElementById('messages');

// Authenticate and set username
// setUsernameButton.addEventListener('click', () => {
//     const username = usernameInput.value.trim();

//     if (username) {
//         socket.emit('set username', username);
//     } else {
//         alert('Please enter a valid username.');
//     }
// });


// Fetch messages
async function loadMessageHistory(userId) {
    try {
        const response = await fetch(`/api/chat/messages?userId=${userId}`);
        const messages = await response.json();

        console.log("Messages received:", messages); 

        if (Array.isArray(messages)) {
            messages.forEach(msg => displayMessage(msg));
        } else {
            console.error('Invalid message data received:', messages);
            // Handle the error gracefully (e.g., display a message to the user)
            const messagesList = document.getElementById('messages');
            messagesList.innerHTML = "<li>Error loading messages. Please try again later.</li>";
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        // Handle the error (display a message to the user)
    }
}

// Display a single message in the UI
function displayMessage(msg) {
    const messagesList = document.getElementById('messages'); 
    const li = document.createElement('li');

    li.innerHTML = `
        <strong>${msg.username}</strong> (${new Date(msg.createdAt).toLocaleTimeString()}): ${msg.content}
    `;
    messagesList.appendChild(li);
}

socket.on('user info', (user) => {
    socket.user = user; 
    loadMessageHistory(user.userId); 
    loadUserGroups(user.userId);
});
socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});

// Listen for successful username setup
socket.on('username set', () => {
    userSection.style.display = 'none'; 
    chatSection.style.display = 'block'; 
    privateMessageSection.style.display = 'block'; 
});

// Handle username errors
socket.on('username error', (message) => {
    alert(message);
});

// Receive active users
socket.on('active users', (users) => {
    usersList.innerHTML = ''; 
    recipientSelect.innerHTML = '<option value="public">Public Chat</option>'; 

    users.forEach(user => {
        // Add user to the active users list
        const li = document.createElement('li');
        li.textContent = user.username;
        if (user.username === socket.username) {
            li.classList.add('current-user');
        }
        usersList.appendChild(li);

        // Add user to the recipient select dropdown
        if (user.username !== socket.username) { 
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            recipientSelect.appendChild(option);
        }
    });
});

// Send public message
document.getElementById('sendButton').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', { content: message });
        messageInput.value = '';
    }
});

// Receive public chat messages
socket.on('chat message', ({ username, message, timestamp }) => {
    const li = document.createElement('li');
    li.classList.add('message', 'public');

    // li.classList.add('message', username === currentUsername ? 'current-user' : 'public');

    li.innerHTML = `
        <img src="default-avatar.jpg" alt="Avatar" class="avatar">
        <div class="message-content">
            <span class="username">${username}</span>
            <span class="timestamp">${new Date(timestamp).toLocaleTimeString()}</span>
            <p class="message-text">${message}</p>
        </div>
    `;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight; 
});


// Handle messages
// socket.on('message', (data) => {
//     const messagesList = document.getElementById('messages');
//     const messageItem = document.createElement('li');
//     messageItem.textContent = `${data.sender}: ${data.message}`;
//     messagesList.appendChild(messageItem);
//     messagesList.scrollTop = messagesList.scrollHeight;
// });

// Typing indicator logic for public chat
let typingTimeout;
messageInput.addEventListener('input', () => {
    socket.emit('typing'); 
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit('stop typing'), 2000); 
});

// Listen for typing events
socket.on('typing', (username) => {
    typingIndicator.textContent = `${username} is typing...`;
    typingIndicator.style.display = 'block';
});

socket.on('stop typing', () => {
    typingIndicator.style.display = 'none';
});

// Send private message
sendPrivateButton.addEventListener('click', () => {
    const recipient = recipientSelect.value; 
    const privateMessageInput = document.getElementById('privateMessageInput');
    const message = privateMessageInput.value.trim();

    if (recipient && message) {
        socket.emit('private message', { recipient, content:message });
        privateMessageInput.value = ''; 
    }
});

// Receive private messages
socket.on('private message', ({ sender, message,timestamp }) => {
    const li = document.createElement('li');
    li.classList.add('message', 'private');
    li.innerHTML = `
        <img src="default-avatar.jpg" alt="Avatar" class="avatar">
        <div class="message-content">
            <span class="username">${sender}</span>
            <span class="timestamp">${new Date(timestamp).toLocaleTimeString()}</span>
            <p class="message-text">${message}</p>
        </div>
    `;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight; 
});

// Send group message
document.getElementById('sendGroupMessageButton').addEventListener('click', () => {
    const groupId = document.getElementById('groupSelect').value;
    const content = document.getElementById('groupMessageInput').value.trim();

    if (content && groupId) {
        socket.emit('group message', { groupId, content });
        document.getElementById('groupMessageInput').value = ''; // Clear input
    }
});


// Receive group messages
socket.on('group message', ({ username, message, groupId, timestamp }) => {
    const messagesList = document.getElementById('messages'); 
    const li = document.createElement('li');

    li.innerHTML = `
        <strong>${username}</strong> (${new Date(timestamp).toLocaleTimeString()}): ${message}
    `;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight; 
});

async function loadUserGroups(userId) {
    try {
        const response = await fetch(`/api/groups/user/${userId}`);
        const groups = await response.json();

        const groupSelect = document.getElementById('groupSelect');
        groupSelect.innerHTML = '<option value="">Select Group</option>'; 

        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group._id;
            option.textContent = group.name;
            groupSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

document.getElementById('joinGroupButton').addEventListener('click', () => {
    const groupId = document.getElementById('groupSelect').value;

    if (groupId) {
        socket.emit('join group', groupId); 
        alert('You have joined the group.');
    } else {
        alert('Please select a group to join.');
    }
});


socket.on('disconnect', () => {
    console.log('Disconnected from the chat server');
    alert('Disconnected from the server. Please refresh the page.');
});



// Capture search input and filter messages
document.getElementById('searchInput').addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();

    if(query){
        socket.emit('search messages', query);
    }else{
        displayMessages(messages);
    }
    
    // Filter messages based on the query
    const filteredMessages = messages.filter(msg => {
        return msg.content.toLowerCase().includes(query) || msg.username.toLowerCase().includes(query);
    });
    
    displayMessages(filteredMessages);
});

// Function to display filtered or all messages
function displayMessages(messagesToDisplay) {
    const messagesList = document.getElementById('messages');
    messagesList.innerHTML = '';  

    // Re-display messages based on the search
    messagesToDisplay.forEach(msg => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${msg.username}</strong> (${new Date(msg.createdAt).toLocaleTimeString()}): ${msg.content}`;
        messagesList.appendChild(li);
    });
};
async function loadGroupMessages(groupId) {
    try {
        const response = await fetch(`/api/groups/group/${groupId}/messages`);
        const messages = await response.json();
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading group messages:', error);
    }
}


socket.on('message search results', (messages) => {
    displayMessages(messages);  
});

document.getElementById('createGroupButton').addEventListener('click', async () => {
    const groupName = document.getElementById('newGroupName').value.trim();
    const userToken = localStorage.getItem('token'); // Assume the token is stored here
    const decodedToken = JSON.parse(atob(userToken.split('.')[1]));
    const creatorId = decodedToken.userId;

    if (!groupName) {
        alert('Group name cannot be empty!');
        return;
    }

    try {
        const response = await fetch('/api/groups/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({ name: groupName, creatorId }),
        });

        if (response.ok) {
            const group = await response.json();
            alert(`Group "${group.name}" created successfully!`);
            loadUserGroups(creatorId); // Refresh the group list
        } else {
            const error = await response.json();
            alert(error.message || 'Error creating group.');
        }
    } catch (error) {
        console.error('Error creating group:', error);
        alert('Failed to create group.');
    }
});




