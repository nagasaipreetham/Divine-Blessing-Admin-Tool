// Global state
let currentConfig = {};
let currentData = { gods: [] };

// Test if JavaScript is loading
console.log('JavaScript file loaded successfully');

// Make functions globally accessible
window.toggleConfigForm = toggleConfigForm;
window.saveConfig = saveConfig;
window.browseJsonFile = browseJsonFile;
window.browseAssetsFolder = browseAssetsFolder;
window.showAddGodForm = showAddGodForm;
window.showAddSongForm = showAddSongForm;
window.viewCurrentData = viewCurrentData;
window.hideAllForms = hideAllForms;
window.updateGodPreview = updateGodPreview;
window.updateSongPreview = updateSongPreview;
window.deleteGod = deleteGod;
window.deleteSong = deleteSong;

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    console.log('App initialized - DOMContentLoaded fired');
    console.log('Functions available:', {
        toggleConfigForm: typeof toggleConfigForm,
        showAddGodForm: typeof showAddGodForm,
        showAddSongForm: typeof showAddSongForm,
        viewCurrentData: typeof viewCurrentData
    });
    
    // Show actions section immediately since we have default config
    showActionsSection();
    
    loadConfig();
    setupFormHandlers();
    setupScrollIndicator();
    setupFormAnimations();
    setupKeyboardShortcutHints();

    // Add error recovery for network issues
    window.addEventListener('online', () => {
        showStatus('🌐 Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
        showStatus('⚠️ Connection lost - some features may not work', 'error');
    });
});

// Configuration functions
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        currentConfig = await response.json();

        if (currentConfig && currentConfig.jsonPath) {
            // Update configuration summary
            updateConfigSummary();
            
            // Only fill fields if using custom paths (for editing)
            const isUsingDefaultJson = currentConfig.jsonPath.includes('assets') &&
                currentConfig.jsonPath.includes('gods_songs.json');
            const isUsingDefaultAssets = currentConfig.androidProjectPath && currentConfig.androidProjectPath.endsWith('assets');

            if (!isUsingDefaultJson) {
                document.getElementById('json-path').value = currentConfig.jsonPath;
            }
            if (!isUsingDefaultAssets) {
                document.getElementById('android-path').value = currentConfig.androidProjectPath;
            }

            showActionsSection();
            loadCurrentData();
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Update configuration summary display
function updateConfigSummary() {
    const statusText = document.getElementById('config-status-text');
    
    const isUsingDefaultJson = currentConfig.jsonPath.includes('assets') &&
        currentConfig.jsonPath.includes('gods_songs.json');
    const isUsingDefaultAssets = currentConfig.androidProjectPath.endsWith('assets');

    if (isUsingDefaultJson && isUsingDefaultAssets) {
        statusText.textContent = 'Using default assets folder files';
        statusText.style.color = '#28a745';
    } else {
        statusText.textContent = 'Using custom file paths';
        statusText.style.color = '#17a2b8';
    }
}

// Toggle configuration form visibility
function toggleConfigForm() {
    const form = document.getElementById('config-form');
    const editBtn = document.getElementById('config-edit-btn');
    
    if (form.style.display === 'none') {
        form.style.display = 'block';
        editBtn.textContent = 'Cancel';
        editBtn.style.background = '#6c757d';
    } else {
        form.style.display = 'none';
        editBtn.textContent = 'Edit';
        editBtn.style.background = '#17a2b8';
        // Clear any validation errors
        clearFormErrors();
    }
}

// Form validation functions
function validateField(fieldId, fieldName, isRequired = true) {
    const field = document.getElementById(fieldId);
    let value;
    
    // Handle different field types
    if (field.tagName.toLowerCase() === 'select') {
        value = field.value;
    } else {
        value = field.value.trim();
    }
    
    // Remove existing error styling
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    if (isRequired && (!value || value === '')) {
        field.classList.add('error');
        const errorMsg = document.createElement('span');
        errorMsg.className = 'error-message';
        errorMsg.textContent = `${fieldName} is required`;
        
        // For select elements, append to the parent of the parent (form-group)
        if (field.tagName.toLowerCase() === 'select') {
            field.parentNode.appendChild(errorMsg);
        } else {
            field.parentNode.appendChild(errorMsg);
        }
        
        return false;
    }
    
    return true;
}

function clearFormErrors() {
    const errorFields = document.querySelectorAll('.error');
    const errorMessages = document.querySelectorAll('.error-message');
    
    errorFields.forEach(field => field.classList.remove('error'));
    errorMessages.forEach(msg => msg.remove());
}

async function saveConfig() {
    const jsonPath = document.getElementById('json-path').value.trim();
    const androidPath = document.getElementById('android-path').value.trim();

    // Clear previous errors
    clearFormErrors();

    // Allow empty paths - server will use defaults
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonPath: jsonPath || '', // Send empty string if no path provided
                androidProjectPath: androidPath || '' // Send empty string if no path provided
            })
        });

        const result = await response.json();

        if (response.ok) {
            currentConfig = result.config;
            updateConfigSummary();
            
            showStatus('✅ Configuration saved successfully!', 'success');
            
            // Close the configuration form
            toggleConfigForm();
            
            showActionsSection();
            loadCurrentData();
        } else {
            showStatus(result.error || 'Failed to save configuration', 'error');
        }
    } catch (error) {
        showStatus('Error saving configuration: ' + error.message, 'error');
    }
}

async function browseJsonFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async function (e) {
        const file = e.target.files[0];
        if (file) {
            const pathInfo = detectFilePath(file);
            let filePath = pathInfo.path;

            // If we don't have a full path, try to get better suggestions from server
            if (pathInfo.confidence === 'low') {
                try {
                    const response = await fetch('/api/browse-file', { method: 'POST' });
                    const result = await response.json();
                    filePath = result.suggestions.desktop + '\\' + file.name;
                } catch (error) {
                    // Keep the estimated path
                }
            }

            // Convert forward slashes to backslashes for Windows
            filePath = filePath.replace(/\//g, '\\');

            // Set the path in the input field
            document.getElementById('json-path').value = filePath;

            // Show appropriate status message
            switch (pathInfo.confidence) {
                case 'high':
                    showStatus(`✅ Full path detected: ${filePath}`, 'success');
                    break;
                case 'medium':
                    showStatus(`📁 File selected: ${file.name}. Path estimated, please verify.`, 'info');
                    break;
                case 'low':
                    showStatus(`📝 File selected: ${file.name}. Please verify the path is correct.`, 'info');
                    break;
            }
        }
    };
    input.click();
}

async function browseAssetsFolder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = async function (e) {
        const files = e.target.files;
        if (files.length > 0) {
            const firstFile = files[0];
            let folderPath = '';
            let folderName = '';

            if (firstFile.webkitRelativePath) {
                // Extract folder path from the first file's relative path
                const relativePath = firstFile.webkitRelativePath;
                const pathParts = relativePath.split('/');
                folderName = pathParts[0]; // Get the root folder name

                try {
                    // Get path suggestions from server
                    const response = await fetch('/api/browse-file', { method: 'POST' });
                    const result = await response.json();

                    // Try to construct full path using desktop as base
                    folderPath = result.suggestions.desktop + '\\' + folderName;
                } catch (error) {
                    // Fallback
                    folderPath = getCommonPath(folderName, true);
                }

                // Convert forward slashes to backslashes for Windows
                folderPath = folderPath.replace(/\//g, '\\');

                // Set the path in the input field
                document.getElementById('android-path').value = folderPath;

                showStatus(`📁 Folder selected: ${folderName}. Path populated automatically.`, 'success');
            } else {
                showStatus('❌ Could not detect folder path. Please enter manually.', 'error');
                document.getElementById('android-path').focus();
            }
        }
    };
    input.click();
}

// Data loading
async function loadCurrentData() {
    try {
        const response = await fetch('/api/data');
        currentData = await response.json();
        updateGodDropdown();
    } catch (error) {
        console.error('Error loading data:', error);
        showStatus('Error loading current data', 'error');
    }
}

// Show version notification only when data changes
function showVersionNotification() {
    if (currentData.version) {
        // Format version timestamp for display
        const version = currentData.version;
        const year = version.substring(0, 4);
        const month = version.substring(4, 6);
        const day = version.substring(6, 8);
        const hours = version.substring(8, 10);
        const minutes = version.substring(10, 12);
        const seconds = version.substring(12, 14);
        
        const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        showStatus(`📊 Data updated - Version: ${version} (${formattedDate})`, 'info');
    }
}

function updateGodDropdown() {
    const select = document.getElementById('song-god');
    select.innerHTML = '<option value="">Choose a god...</option>';

    currentData.gods.forEach(god => {
        const option = document.createElement('option');
        option.value = god.id;
        option.textContent = god.name;
        select.appendChild(option);
    });
}

// UI functions
function showActionsSection() {
    const section = document.getElementById('actions-section');
    if (section) {
        section.style.display = 'block';
    }
}

function showAddGodForm() {
    hideAllForms();
    showFormWithAnimation('add-god-section');
}

function showAddSongForm() {
    if (!currentData.gods || currentData.gods.length === 0) {
        showStatus('Please add at least one god before adding songs', 'error');
        return;
    }
    hideAllForms();
    updateGodDropdown();
    showFormWithAnimation('add-song-section');
}

function viewCurrentData() {
    hideAllForms();
    displayCurrentData();
    showFormWithAnimation('data-viewer-section');
}

function hideAllForms() {
    const sections = ['add-god-section', 'add-song-section', 'data-viewer-section'];
    sections.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
}

// Preview functions for auto-generated values
async function updateGodPreview() {
    const nameInput = document.getElementById('god-name');
    const previewBox = document.getElementById('god-preview');
    const previewId = document.getElementById('preview-god-id');
    const previewName = document.getElementById('preview-god-name');
    
    const name = nameInput.value.trim();
    
    if (!name) {
        previewBox.style.display = 'none';
        return;
    }
    
    // Add updating animation
    previewBox.classList.add('updating');
    
    try {
        const response = await fetch('/api/preview-god', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        const result = await response.json();
        
        previewId.textContent = result.id;
        previewName.textContent = result.name;
        
        previewBox.style.display = 'block';
        previewBox.classList.remove('updating');
        previewBox.classList.add('updated');
        
        setTimeout(() => {
            previewBox.classList.remove('updated');
        }, 300);
        
    } catch (error) {
        console.error('Error updating god preview:', error);
        previewBox.style.display = 'none';
    }
}

async function updateSongPreview() {
    const godSelect = document.getElementById('song-god');
    const previewBox = document.getElementById('song-preview');
    const previewId = document.getElementById('preview-song-id');
    
    const godId = godSelect.value;
    
    if (!godId) {
        previewBox.style.display = 'none';
        return;
    }
    
    // Add updating animation
    previewBox.classList.add('updating');
    
    try {
        const response = await fetch('/api/preview-song', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ godId })
        });
        
        const result = await response.json();
        
        previewId.textContent = result.id;
        
        previewBox.style.display = 'block';
        previewBox.classList.remove('updating');
        previewBox.classList.add('updated');
        
        setTimeout(() => {
            previewBox.classList.remove('updated');
        }, 300);
        
    } catch (error) {
        console.error('Error updating song preview:', error);
        previewBox.style.display = 'none';
    }
}

// Form handlers
function setupFormHandlers() {
    // God form handler
    document.getElementById('god-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        // Clear previous errors
        clearFormErrors();

        // Validate required fields
        let isValid = true;
        
        // Validate god name (required)
        if (!validateField('god-name', 'God name', true)) {
            isValid = false;
        }
        
        // Validate display order (required)
        if (!validateField('god-display-order', 'Display order', true)) {
            isValid = false;
        }

        if (!isValid) {
            showStatus('❌ Please fill in all required fields', 'error');
            return;
        }

        const name = document.getElementById('god-name').value.trim();
        const displayOrder = document.getElementById('god-display-order').value;

        const formData = new FormData();
        formData.append('name', name); // Only send name, server will auto-generate ID
        formData.append('displayOrder', displayOrder);

        const imageFile = document.getElementById('god-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const response = await fetch('/api/gods', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showStatus('✅ God added successfully! You can add another or press Esc to close.', 'success');
                // Show version notification
                if (result.god) {
                    setTimeout(() => {
                        showVersionNotification();
                    }, 1000);
                }
                document.getElementById('god-form').reset();
                document.getElementById('god-preview').style.display = 'none'; // Hide preview after reset
                clearFormErrors(); // Clear any validation errors
                loadCurrentData();
                // Don't close form automatically - let user decide
            } else {
                showStatus(result.error || 'Failed to add god', 'error');
            }
        } catch (error) {
            showStatus('Error adding god: ' + error.message, 'error');
        }
    });

    // Song form handler
    document.getElementById('song-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        // Clear previous errors
        clearFormErrors();

        // Validate required fields
        let isValid = true;
        
        // Validate god selection (required)
        if (!validateField('song-god', 'God selection', true)) {
            isValid = false;
        }
        
        // Validate song title (required)
        if (!validateField('song-title', 'Song title', true)) {
            isValid = false;
        }
        
        // Validate display order (required)
        if (!validateField('song-display-order', 'Display order', true)) {
            isValid = false;
        }

        if (!isValid) {
            showStatus('❌ Please fill in all required fields', 'error');
            return;
        }

        const godId = document.getElementById('song-god').value;
        const title = document.getElementById('song-title').value.trim();

        const formData = new FormData();
        formData.append('title', title); // Only send title, server will auto-generate ID
        formData.append('godId', godId);
        formData.append('languageDefault', document.getElementById('song-language').value);
        formData.append('duration', document.getElementById('song-duration').value);
        formData.append('displayOrder', document.getElementById('song-display-order').value);

        const audioFile = document.getElementById('song-audio').files[0];
        if (audioFile) {
            formData.append('audio', audioFile);
        }

        const teluguLyricsFile = document.getElementById('song-lyrics-telugu').files[0];
        if (teluguLyricsFile) {
            formData.append('lyricsTeluguFile', teluguLyricsFile);
        }

        const englishLyricsFile = document.getElementById('song-lyrics-english').files[0];
        if (englishLyricsFile) {
            formData.append('lyricsEnglishFile', englishLyricsFile);
        }

        try {
            const response = await fetch('/api/songs', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showStatus('✅ Song added successfully! You can add another or press Esc to close.', 'success');
                // Show version notification
                if (result.song) {
                    setTimeout(() => {
                        showVersionNotification();
                    }, 1000);
                }
                document.getElementById('song-form').reset();
                document.getElementById('song-preview').style.display = 'none';
                clearFormErrors();
                loadCurrentData();
                updateGodDropdown();
                // Don't close form automatically - let user decide
            } else {
                showStatus(result.error || 'Failed to add song', 'error');
            }
        } catch (error) {
            showStatus('Error adding song: ' + error.message, 'error');
        }
    });
}

// Data display functions
function displayCurrentData() {
    const container = document.getElementById('data-content');

    // Display version information at the top
    let html = '';
    if (currentData.version) {
        const version = currentData.version;
        const year = version.substring(0, 4);
        const month = version.substring(4, 6);
        const day = version.substring(6, 8);
        const hours = version.substring(8, 10);
        const minutes = version.substring(10, 12);
        const seconds = version.substring(12, 14);
        
        const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        html += `
            <div class="version-info" style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                <h4 style="margin: 0 0 5px 0; color: #1976d2;">📊 Data Version Information</h4>
                <p style="margin: 0; color: #424242;">
                    <strong>Version:</strong> ${version}<br>
                    <strong>Last Updated:</strong> ${formattedDate}
                </p>
            </div>
        `;
    }

    if (!currentData.gods || currentData.gods.length === 0) {
        container.innerHTML = html + '<p>No gods found. Add some gods to get started!</p>';
        return;
    }

    currentData.gods.forEach(god => {
        html += `
            <div class="data-item">
                <h3>${god.name} (${god.id})
                    <button class="delete-btn" onclick="deleteGod('${god.id}')">Delete</button>
                </h3>
                <p><strong>Display Order:</strong> ${god.displayOrder}</p>
                <p><strong>Image:</strong> ${god.imageFileName || 'None'}</p>
                
                <div class="songs">
                    <h4>Songs (${god.songs ? god.songs.length : 0}):</h4>
                    ${god.songs && god.songs.length > 0 ?
                god.songs.map(song => `
                            <div class="song">
                                <strong>${song.title}</strong> (${song.id})
                                <button class="delete-btn" onclick="deleteSong('${song.id}')">Delete</button>
                                <br>
                                <small>Language: ${song.languageDefault} | Duration: ${song.duration}ms | Order: ${song.displayOrder}</small>
                                <br>
                                <small>Audio: ${song.audioFileName || 'None'}</small>
                                <br>
                                <small>Telugu Lyrics: ${song.lyricsTeluguFileName || 'None'}</small>
                                <br>
                                <small>English Lyrics: ${song.lyricsEnglishFileName || 'None'}</small>
                            </div>
                        `).join('')
                : '<p>No songs added yet.</p>'
            }
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Delete functions
async function deleteGod(godId) {
    const god = currentData.gods.find(g => g.id === godId);
    const godName = god ? god.name : godId;
    const songCount = god && god.songs ? god.songs.length : 0;

    showCustomDialog(
        '🗑️ Delete God',
        `Are you sure you want to delete "${godName}"?

This will permanently delete:
• The god entry
• All ${songCount} associated songs
• All related files (images, audio, lyrics)

This action cannot be undone.`,
        [
            {
                text: 'Delete',
                action: async () => {
                    try {
                        const response = await fetch(`/api/gods/${godId}`, {
                            method: 'DELETE'
                        });

                        const result = await response.json();

                        if (response.ok) {
                            showStatus('God deleted successfully!', 'success');
                            setTimeout(() => {
                                showVersionNotification();
                            }, 1000);
                            loadCurrentData();
                            displayCurrentData();
                        } else {
                            showStatus(result.error || 'Failed to delete god', 'error');
                        }
                    } catch (error) {
                        showStatus('Error deleting god: ' + error.message, 'error');
                    }
                }
            },
            {
                text: 'Cancel',
                action: () => { } // Do nothing
            }
        ]
    );
}

async function deleteSong(songId) {
    // Find the song details
    let songName = songId;
    let godName = '';

    for (const god of currentData.gods) {
        if (god.songs) {
            const song = god.songs.find(s => s.id === songId);
            if (song) {
                songName = song.title;
                godName = god.name;
                break;
            }
        }
    }

    showCustomDialog(
        '🗑️ Delete Song',
        `Are you sure you want to delete "${songName}"?

From: ${godName}

This will permanently delete:
• The song entry
• Audio file
• Lyrics files (Telugu & English)

This action cannot be undone.`,
        [
            {
                text: 'Delete',
                action: async () => {
                    try {
                        const response = await fetch(`/api/songs/${songId}`, {
                            method: 'DELETE'
                        });

                        const result = await response.json();

                        if (response.ok) {
                            showStatus('Song deleted successfully!', 'success');
                            setTimeout(() => {
                                showVersionNotification();
                            }, 1000);
                            loadCurrentData();
                            displayCurrentData();
                        } else {
                            showStatus(result.error || 'Failed to delete song', 'error');
                        }
                    } catch (error) {
                        showStatus('Error deleting song: ' + error.message, 'error');
                    }
                }
            },
            {
                text: 'Cancel',
                action: () => { } // Do nothing
            }
        ]
    );
}

// Custom dialog system
function showCustomDialog(title, message, buttons) {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('custom-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.id = 'custom-dialog';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    // Create dialog box
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 25px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        animation: dialogSlideIn 0.3s ease;
    `;

    // Add animation keyframes
    if (!document.getElementById('dialog-styles')) {
        const style = document.createElement('style');
        style.id = 'dialog-styles';
        style.textContent = `
            @keyframes dialogSlideIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Dialog content
    dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 1.3rem;">${title}</h3>
        <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5; white-space: pre-line;">${message}</p>
        <div id="dialog-buttons" style="display: flex; gap: 10px; justify-content: flex-end;"></div>
    `;

    // Add buttons
    const buttonContainer = dialog.querySelector('#dialog-buttons');
    buttons.forEach((button, index) => {
        const btn = document.createElement('button');
        btn.textContent = button.text;
        btn.style.cssText = `
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            ${index === 0 ?
                'background: #dc3545; color: white;' :
                'background: #6c757d; color: white;'
            }
        `;

        btn.onmouseover = () => {
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        };

        btn.onmouseout = () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = 'none';
        };

        btn.onclick = () => {
            overlay.remove();
            if (button.action) button.action();
        };

        buttonContainer.appendChild(btn);
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };

    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Status message system
function showStatus(message, type = 'info') {
    const container = document.getElementById('status-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message status-${type}`;
    messageDiv.textContent = message;

    container.appendChild(messageDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);

    // Make it clickable to dismiss
    messageDiv.addEventListener('click', () => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    });
}

// Path helper function
function getCommonPath(filename, isFolder = false) {
    let username = 'User';

    // Try to get username from environment (limited in browsers)
    try {
        if (navigator.userAgentData && navigator.userAgentData.platform) {
            // Modern browsers might have some info in the future
        }
    } catch (error) {
        // Ignore errors, use default username
    }

    const basePaths = [
        `C:\\Users\\${username}\\Desktop`,
        `C:\\Users\\${username}\\Documents`,
        `C:\\Users\\${username}\\Downloads`
    ];

    if (isFolder) {
        return basePaths[0] + '\\' + filename; // Default to Desktop for folders
    } else {
        return basePaths[0] + '\\' + filename; // Default to Desktop for files
    }
}

// Enhanced file path detection
function detectFilePath(file) {
    // Priority order for path detection
    if (file.path) {
        return { path: file.path, confidence: 'high', source: 'file.path' };
    }

    if (file.webkitRelativePath) {
        return { path: file.webkitRelativePath, confidence: 'medium', source: 'webkitRelativePath' };
    }

    // Fallback to common path
    const commonPath = getCommonPath(file.name);
    return { path: commonPath, confidence: 'low', source: 'estimated' };
}

// Utility functions
function generateId(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// File name suggestions
document.getElementById('song-audio').addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const title = document.getElementById('song-title').value.trim();
        if (title) {
            const suggestedName = generateId(title);
            if (!file.name.toLowerCase().includes(suggestedName.toLowerCase())) {
                showStatus(`💡 Consider renaming audio file to: ${suggestedName}.${file.name.split('.').pop()}`, 'info');
            }
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'g':
                e.preventDefault();
                showAddGodForm();
                break;
            case 's':
                e.preventDefault();
                showAddSongForm();
                break;
            case 'd':
                e.preventDefault();
                viewCurrentData();
                break;
        }
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        hideAllForms();
    }
});

// Scroll indicator setup
function setupScrollIndicator() {
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.style.transform = 'scaleX(0)';
    document.body.appendChild(scrollIndicator);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.body.offsetHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;
        scrollIndicator.style.transform = `scaleX(${scrollPercent})`;
    });
}

// Form animations setup
function setupFormAnimations() {
    // Add entrance animations to existing cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Enhanced form display with better animations
function showFormWithAnimation(sectionId) {
    const section = document.getElementById(sectionId);

    // First hide the section to reset animation
    section.style.display = 'none';
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';

    // Show the section
    section.style.display = 'block';

    // Trigger animation after a brief delay
    setTimeout(() => {
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
    }, 50);

    // Smooth scroll to the form
    setTimeout(() => {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 150);
}

// Add keyboard shortcut hints
function setupKeyboardShortcutHints() {
    const shortcuts = document.createElement('div');
    shortcuts.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 1000;
        transition: all 0.3s ease;
        opacity: 0.8;
    `;
    shortcuts.innerHTML = `
        <strong>Shortcuts:</strong><br>
        Ctrl+G: Add God<br>
        Ctrl+S: Add Song<br>
        Ctrl+D: View Data<br>
        Esc: Close Forms
    `;

    shortcuts.addEventListener('mouseenter', () => {
        shortcuts.style.opacity = '1';
        shortcuts.style.transform = 'scale(1.05)';
    });

    shortcuts.addEventListener('mouseleave', () => {
        shortcuts.style.opacity = '0.8';
        shortcuts.style.transform = 'scale(1)';
    });

    document.body.appendChild(shortcuts);
}
