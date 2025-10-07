# 🕉️ Divine Blessing Admin Tool

> **Offline web-based content management system for Android App - Divine Blessings**

A powerful, user-friendly admin interface for managing gods, songs, and multimedia content for Android devotional applications. Built with Node.js and vanilla JavaScript for simplicity and reliability.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-v14+-brightgreen.svg)](https://nodejs.org/)

## 📋 Table of Contents

- [Features](#-features)
- [Core Concepts](#-core-concepts)
- [Technical Architecture](#-technical-architecture)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [File Structure](#-file-structure)
- [Configuration](#-configuration)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🎯 **Core Functionality**
- **God Management**: Add, view, and delete gods with images and metadata
- **Song Management**: Add songs with audio files, lyrics (Telugu & English), and metadata
- **File Organization**: Automatic file copying and organization in assets folder
- **Data Validation**: Form validation and error handling
- **Real-time Preview**: View current data structure instantly

### 🚀 **User Experience**
- **Clean Interface**: Modern, responsive web UI
- **Drag & Drop**: Easy file uploads with browse functionality
- **Auto-generation**: Automatic ID generation from names
- **Keyboard Shortcuts**: Quick access to common actions
- **Status Feedback**: Real-time status messages and progress indicators
- **Version Tracking**: Automatic versioning with timestamp display
- **Offline Operation**: Works completely offline - no internet required

### 🔧 **Technical Features**
- **Default Configuration**: Uses local assets folder by default
- **Custom Paths**: Support for custom JSON and assets folder locations
- **File Management**: Automatic file copying and organization
- **Error Recovery**: Graceful error handling and recovery
- **Cross-platform**: Works on Windows, macOS, and Linux

## 🧠 Core Concepts

### **Data Structure**
The application manages a hierarchical structure with automatic versioning:
```
JSON Root
├── version: "20251007203758"    # Auto-generated timestamp
└── gods: []                     # Array of gods
    ├── God 1
    │   ├── Metadata (ID, Name, Image, Display Order)
    │   └── Songs[]
    │       ├── Song 1 (Audio, Lyrics, Metadata)
    │       ├── Song 2
    │       └── ...
    ├── God 2
    └── ...
```

### **Automatic Versioning**
Every change to the data automatically updates the version timestamp:
- **Format**: `yyyyMMddHHmmss` (e.g., `20251007203758`)
- **Updates on**: Add/delete gods, add/delete songs, any data modification
- **Purpose**: Track changes, sync detection, data integrity

### **File Organization**
```
assets/
├── gods_songs.json          # Main data file with versioning
├── images/                  # God images
├── audio/                   # Song audio files
└── lyrics/
    ├── telugu/             # Telugu lyrics (.lrc/.txt)
    └── english/            # English lyrics (.lrc/.txt)
```

### **JSON Structure Example**
```json
{
  "version": "20251007203758",
  "gods": [
    {
      "id": "god_shiva",
      "name": "Lord Shiva",
      "imageFileName": "shiva.png",
      "displayOrder": 1,
      "songs": [
        {
          "id": "song_shiva_1",
          "title": "Shiva Tandava Stotram",
          "godId": "god_shiva",
          "languageDefault": "telugu",
          "audioFileName": "song_shiva_1.mp3",
          "lyricsTeluguFileName": "song_shiva_1_te.lrc",
          "lyricsEnglishFileName": "song_shiva_1_en.lrc",
          "duration": 420000,
          "displayOrder": 1
        }
      ]
    }
  ]
}
```

### **Workflow**
1. **Configure** → Set paths (or use defaults)
2. **Add Gods** → Create god entries with images
3. **Add Songs** → Attach songs to gods with audio and lyrics
4. **Export** → Use generated JSON in your Android app

## 🏗️ Technical Architecture

### **Backend (Node.js + Express)**
- **Express Server**: RESTful API with file upload support
- **Multer**: Multipart form handling for file uploads
- **fs-extra**: Enhanced file system operations
- **CORS**: Cross-origin resource sharing support

### **Frontend (Vanilla JavaScript)**
- **Modern ES6+**: Clean, maintainable JavaScript
- **Responsive Design**: CSS Grid and Flexbox
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **File API**: Modern browser file handling

### **Data Management**
- **JSON Storage**: Human-readable data format
- **Atomic Operations**: Safe file operations with error recovery
- **Validation**: Client and server-side data validation
- **Backup**: Automatic backup creation before modifications

## 🚀 Installation

### **Prerequisites**
- **Node.js** v14 or higher
- **npm** (comes with Node.js)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### **Quick Start**
```bash
# Clone or download the project
cd divine-blessing-admin-tool

# Install dependencies
npm install

# Start the server
npm start
```

### **Alternative Start Methods**
```bash
# Direct node execution
node server.js

# Development mode
npm run dev
```

The application will be available at: **http://localhost:3000**

## 📖 Usage

### **1. Initial Setup**
1. **Start the server**: `npm start`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Configure paths**: 
   - Leave fields empty to use default `assets/` folder
   - Or specify custom paths for JSON file and assets folder
4. **Save configuration**: Click "Save Configuration"

### **2. Adding Gods**
1. **Click "Add God"** button
2. **Fill required fields**:
   - **God ID**: Unique identifier (auto-generated from name)
   - **God Name**: Display name
   - **Display Order**: Sorting order (optional)
   - **Image**: God image file (optional)
3. **Submit**: Click "Add God"

### **3. Adding Songs**
1. **Click "Add Song"** button
2. **Select God**: Choose from existing gods
3. **Fill song details**:
   - **Song ID**: Unique identifier (auto-generated)
   - **Title**: Song display name
   - **Language**: Default language (Telugu/English)
   - **Audio File**: Song audio file
   - **Lyrics**: Telugu and/or English lyrics files
   - **Duration**: Song duration in milliseconds
   - **Display Order**: Sorting order
4. **Submit**: Click "Add Song"

### **4. Managing Data**
- **View Data**: Click "View Data" to see current structure
- **Delete Items**: Use delete buttons in data view
- **Edit**: Currently requires manual JSON editing

### **5. Keyboard Shortcuts**
- **Ctrl+G**: Add God
- **Ctrl+S**: Add Song  
- **Ctrl+D**: View Data
- **Escape**: Close forms

## 🔌 API Reference

### **Configuration**
```http
GET /api/config
POST /api/config
```

### **Data Management**
```http
GET /api/data                    # Get current JSON data
```

### **God Management**
```http
POST /api/gods                   # Add new god
DELETE /api/gods/:godId          # Delete god and all songs
```

### **Song Management**
```http
POST /api/songs                  # Add new song
DELETE /api/songs/:songId        # Delete song
```

### **File Operations**
```http
POST /api/browse-file           # Get file path suggestions
```

## 📁 File Structure

```
divine-blessing-admin-tool/
├── 📄 server.js                # Main server file
├── 📄 package.json             # Project configuration
├── 📄 README.md                # This file
├── 📁 public/                  # Frontend files
│   ├── 📄 index.html           # Main HTML page
│   ├── 📄 app.js               # Frontend JavaScript
│   └── 📄 styles.css           # Styling
├── 📁 assets/                  # Default data location
│   ├── 📄 gods_songs.json      # Main data file
│   ├── 📁 images/              # God images
│   ├── 📁 audio/               # Song audio files
│   └── 📁 lyrics/              # Lyrics files
│       ├── 📁 telugu/
│       └── 📁 english/
├── 📁 uploads/                 # Temporary upload directory
└── 📁 node_modules/            # Dependencies
```

## ⚙️ Configuration

### **Default Configuration**
The application uses sensible defaults:
- **JSON File**: `./assets/gods_songs.json`
- **Assets Folder**: `./assets/`
- **Port**: `3000`

### **Custom Configuration**
You can specify custom paths through the web interface:
- **JSON File Path**: Full path to your data file
- **Assets Folder Path**: Full path to your assets directory

### **Environment Variables**
```bash
PORT=3000                       # Server port (optional)
```

## 🛠️ Development

### **Project Structure**
- **Backend**: Express.js server with RESTful API
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: CSS with custom properties and modern layout
- **File Handling**: Multer for uploads, fs-extra for file operations

### **Key Files**
- **`server.js`**: Main server logic and API endpoints
- **`public/app.js`**: Frontend application logic
- **`public/index.html`**: User interface structure
- **`public/styles.css`**: Application styling

### **Adding Features**
1. **Backend**: Add routes in `server.js`
2. **Frontend**: Add functions in `public/app.js`
3. **UI**: Update `public/index.html` and `public/styles.css`

### **Testing**
```bash
# Start development server
npm run dev

# Test in browser
open http://localhost:3000
```

## 🔧 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Kill existing process or use different port
```bash
# Kill process on port 3000
npx kill-port 3000

# Or set different port
PORT=3001 npm start
```

#### **File Upload Issues**
- **Check file permissions** in uploads directory
- **Verify file size limits** (default: no limit)
- **Ensure proper file types** are being uploaded

#### **JSON File Corruption**
- **Backup**: Automatic backups are created before modifications
- **Recovery**: Restore from `assets/gods_songs.json.backup`
- **Reset**: Delete JSON file to start fresh

#### **Browser Compatibility**
- **Modern browsers required** (ES6+ support)
- **File API support** needed for file uploads
- **Local storage** used for temporary data

### **Debug Mode**
Enable detailed logging by modifying `server.js`:
```javascript
const DEBUG = true; // Set to true for debug mode
```

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m "Add feature"`
5. Push to branch: `git push origin feature-name`
6. Create Pull Request

### **Code Style**
- **JavaScript**: ES6+ with consistent formatting
- **HTML**: Semantic markup with accessibility
- **CSS**: Modern CSS with custom properties
- **Comments**: Clear, concise documentation

### **Testing Checklist**
- [ ] All forms validate properly
- [ ] File uploads work correctly
- [ ] Data persistence functions
- [ ] Error handling works
- [ ] UI is responsive
- [ ] Keyboard shortcuts function

## 📄 License

This project is licensed under the **ISC License**.

```
Copyright (c) 2024 Preetham

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.
```

## 🙏 Acknowledgments

- **Express.js** - Fast, unopinionated web framework
- **Multer** - Node.js middleware for handling multipart/form-data
- **fs-extra** - Extra file system methods for Node.js

---

## 📞 Support

For issues, questions, or contributions:
- **Create an issue** in the repository
- **Check existing documentation** in this README
- **Review troubleshooting section** above

**Made with ❤️ for devotional app developers**

---

*Last updated: October 2024*