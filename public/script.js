// Global variables to store processed data
let studentData = [];
let currentDisplayData = [];

// Session Management
function checkSession() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('currentUser');
    closeModal('fileUploadModal');
    document.getElementById('uploadForm').reset();
    document.getElementById('basicStats').innerHTML = '';   
    document.getElementById('message').innerHTML = '';
    alert('Logged out successfully');
}

// File Upload Handler
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const messageDiv = document.getElementById('message');
    
    if (!fileInput.files[0]) {
        messageDiv.innerHTML = '<p class="error">Please select a file</p>';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        messageDiv.innerHTML = '<p class="info">Uploading file...</p>';

        // Upload file to server
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload failed');
        }

        // Read and display the file
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                studentData = XLSX.utils.sheet_to_json(firstSheet);
                currentDisplayData = studentData;

                displayData(studentData);
                messageDiv.innerHTML = '<p class="success">File uploaded and displayed successfully</p>';
                displayAllFiles();
            } catch (error) {
                messageDiv.innerHTML = '<p class="error">Error processing file: ' + error.message + '</p>';
            }
        };

        reader.onerror = function() {
            messageDiv.innerHTML = '<p class="error">Error reading file</p>';
        };

        reader.readAsArrayBuffer(fileInput.files[0]);

    } catch (error) {
        console.error('Error:', error);
        messageDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
});

// Display Functions
function displayData(data) {
    if (!data || data.length === 0) {
        document.getElementById("basicStats").innerHTML = '<p class="no-results">No data to display</p>';
        return;
    }

    // Get all headers from the first record
    const headers = Object.keys(data[0]);

    let tableHTML = `
        <div class="compact-table">
            <h2>Student Records</h2>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
    `;

    data.forEach(record => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<td>${record[header] || ''}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("basicStats").innerHTML = tableHTML;
}

// Search Functions
async function searchStudent() {
    const searchValue = document.getElementById("searchInput").value.trim();
    const searchResults = document.getElementById("searchResults");
    
    if (!searchValue) {
        searchResults.innerHTML = '<p class="error">Please enter a student number</p>';
        return;
    }

    try {
        const response = await fetch(`/search/${searchValue}`);
        if (!response.ok) throw new Error('Search failed');
        
        const results = await response.json();
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="no-results">No records found</p>';
            return;
        }

        displaySearchResults(results);
    } catch (error) {
        console.error('Error:', error);
        searchResults.innerHTML = `<p class="error">Error searching: ${error.message}</p>`;
    }
}

function displaySearchResults(results) {
    const searchResults = document.getElementById("searchResults");
    let tableHTML = `<div class="compact-table">`;

    results.forEach(result => {
        // Get headers from the first record of each file
        const headers = result.records.length > 0 ? Object.keys(result.records[0]) : [];

        tableHTML += `
            <div class="file-section">
                <h3>${result.fileName}</h3>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(header => `<th>${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        result.records.forEach(record => {
            tableHTML += '<tr>';
            headers.forEach(header => {
                tableHTML += `<td>${record[header] || ''}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    tableHTML += `</div>`;
    searchResults.innerHTML = tableHTML;
}

// Modal and Tab Functions
function openModal(modalId) {
    if (modalId === 'fileUploadModal' && !checkSession()) {
        alert('Please login first');
        openModal('uploadModal');
        return;
    }
    
    document.getElementById(modalId).style.display = 'block';
    
    if (modalId === 'fileUploadModal' && checkSession()) {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        updateFileUploadHeader(user.username);
        displayAllFiles();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// Login/Register Handlers
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const username = form.querySelector('input[type="text"]').value;
    const password = form.querySelector('input[type="password"]').value;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem('currentUser', JSON.stringify({
            username: user.username,
            loginTime: new Date().toISOString()
        }));
        
        closeModal('uploadModal');
        openModal('fileUploadModal');
        updateFileUploadHeader(user.username);
    } else {
        alert('Invalid credentials');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const username = form.querySelector('input[type="text"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const adminCode = form.querySelector('input[placeholder="Administrative Code"]').value;

    if (adminCode !== 'FLAMEHEART21') {
        alert('Invalid administrative code');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({ 
        username, 
        password,
        registrationDate: new Date().toLocaleString()
    });
    localStorage.setItem('users', JSON.stringify(users));

    alert('Registration successful! Please login.');
    showTab('login');
}

function updateFileUploadHeader(username) {
    const modalContent = document.querySelector('#fileUploadModal .modal-content');
    const header = modalContent.querySelector('.modal-header') || document.createElement('div');
    
    if (!header.classList.contains('modal-header')) {
        header.classList.add('modal-header');
        modalContent.insertBefore(header, modalContent.firstChild);
    }
    
    // Get all users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    header.innerHTML = `
        <div class="user-info">
            <span>Welcome, ${username}</span>
            <div class="user-actions">
                <button onclick="showRegisteredUsers()" class="btn-info">View Users</button>
                <button onclick="logout()" class="btn-logout">Logout</button>
            </div>
        </div>
    `;
}

// Add this new function
async function displayAllFiles() {
    const messageDiv = document.getElementById('message');
    const statsDiv = document.getElementById('basicStats');
    
    try {
        messageDiv.innerHTML = '<p class="info">Loading all files...</p>';
        
        const response = await fetch('/getAllFiles');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch files');
        }
        
        const data = await response.json();
        const results = data.files || [];
        
        if (results.length === 0) {
            statsDiv.innerHTML = '<p class="no-results">No files found in the directory</p>';
            messageDiv.innerHTML = '';
            return;
        }

        let tableHTML = `<div class="all-files-section">`;

        results.forEach((result, index) => {
            const headers = result.records.length > 0 ? Object.keys(result.records[0]) : [];

            tableHTML += `
                <div class="compact-table">
                    <div class="file-header">
                        <h3>${result.fileName}</h3>
                        <button onclick="deleteFile('${result.fileName}')" class="btn-delete">Delete</button>
                    </div>
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    ${headers.map(header => `<th>${header}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
            `;

            result.records.forEach(record => {
                tableHTML += '<tr>';
                headers.forEach(header => {
                    tableHTML += `<td>${record[header] || ''}</td>`;
                });
                tableHTML += '</tr>';
            });

            tableHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            if (index < results.length - 1) {
                tableHTML += '<div class="file-divider"></div>';
            }
        });

        tableHTML += `</div>`;
        statsDiv.innerHTML = tableHTML;
        messageDiv.innerHTML = '<p class="success">All files loaded successfully</p>';

    } catch (error) {
        console.error('Error:', error);
        messageDiv.innerHTML = `<p class="error">Error loading files: ${error.message}</p>`;
        statsDiv.innerHTML = '';
    }
}
// Add the delete function
async function deleteFile(filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
        return;
    }

    try {
        const response = await fetch(`/deleteFile/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (response.ok) {
            displayAllFiles(); // Refresh the display
            document.getElementById('message').innerHTML = '<p class="success">File deleted successfully</p>';
        } else {
            throw new Error(result.error || 'Failed to delete file');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('message').innerHTML = `<p class="error">Error deleting file: ${error.message}</p>`;
        displayAllFiles();
    }

}

// Add this new function
function showRegisteredUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const statsDiv = document.getElementById('basicStats');
    
    let tableHTML = `
        <div class="compact-table">
            <h2>Registered Uploaders</h2>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    users.forEach(user => {
        tableHTML += `
            <tr>
                <td>${user.username}</td>
                <td><span class="status-active">Active</span></td>
                <td>
                    ${user.username !== currentUser.username ? 
                        `<button onclick="deleteUser('${user.username}')" class="btn-delete-user">Delete</button>` : 
                        '<span class="current-user">Current User</span>'}
                </td>
            </tr>
        `;
    });

    tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    statsDiv.innerHTML = tableHTML;
}

// Add this new function
function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete user: ${username}?`)) {
        return;
    }

    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = users.filter(user => user.username !== username);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        
        // Refresh the display
        showRegisteredUsers();
        
        // Show success message
        document.getElementById('message').innerHTML = `
            <p class="success">User ${username} deleted successfully</p>
        `;
    } catch (error) {
        console.error('Error deleting user:', error);
        document.getElementById('message').innerHTML = `
            <p class="error">Error deleting user: ${error.message}</p>
        `;
    }
}

