const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store configuration - defaults to assets folder
let config = {
    jsonPath: path.join(__dirname, 'assets', 'gods_songs.json'),
    androidProjectPath: path.join(__dirname, 'assets')
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/config', (req, res) => {
    res.json(config);
});

app.post('/api/config', (req, res) => {
    const { jsonPath, androidProjectPath } = req.body;

    // Use default paths if empty - assets folder for JSON
    const finalJsonPath = jsonPath || path.join(__dirname, 'assets', 'gods_songs.json');
    const finalAndroidPath = androidProjectPath || path.join(__dirname, 'assets');

    // Check if file exists, create if it doesn't
    if (!fs.existsSync(finalJsonPath)) {
        try {
            // Ensure the directory exists
            fs.ensureDirSync(path.dirname(finalJsonPath));
            // Create the default JSON file with initial structure
            const defaultData = { gods: [] };
            fs.writeJsonSync(finalJsonPath, defaultData, { spaces: 2 });
            console.log(`Created default JSON file: ${finalJsonPath}`);
        } catch (error) {
            return res.status(400).json({ 
                error: `Could not create JSON file at ${finalJsonPath}: ${error.message}` 
            });
        }
    }

    // Try to read and validate the JSON file
    try {
        let data;
        const fileContent = fs.readFileSync(finalJsonPath, 'utf8').trim();
        
        if (fileContent === '') {
            // Empty file - initialize with default structure
            data = { gods: [] };
            fs.writeJsonSync(finalJsonPath, data, { spaces: 2 });
            console.log('Initialized empty JSON file with default structure');
        } else {
            // Try to parse existing content
            data = JSON.parse(fileContent);
            
            // Ensure it has the required structure
            if (!data.gods) {
                data.gods = [];
                fs.writeJsonSync(finalJsonPath, data, { spaces: 2 });
                console.log('Added missing gods array to JSON file');
            }
        }
    } catch (error) {
        return res.status(400).json({ 
            error: `Invalid JSON file: ${error.message}. Please ensure the file is valid JSON or empty.` 
        });
    }

    config.jsonPath = finalJsonPath;
    config.androidProjectPath = finalAndroidPath;

    res.json({ 
        message: 'Configuration updated successfully', 
        config,
        info: 'Empty JSON files are automatically initialized with the correct structure'
    });
});

app.get('/api/data', (req, res) => {
    if (!config.jsonPath) {
        return res.status(400).json({ error: 'JSON path not configured' });
    }

    try {
        const fileContent = fs.readFileSync(config.jsonPath, 'utf8').trim();
        
        if (fileContent === '') {
            // Empty file - return default structure
            const emptyData = { gods: [] };
            res.json(emptyData);
            return;
        }

        const data = JSON.parse(fileContent);
        
        // Ensure data has the required structure
        if (!data.gods) {
            data.gods = [];
        }
        
        res.json(data);
    } catch (error) {
        console.error('Error reading JSON file:', error);
        // Return empty structure if file is corrupted
        const emptyData = { gods: [] };
        res.json(emptyData);
    }
});

app.post('/api/gods', upload.single('image'), async (req, res) => {
    try {
        const { id, name, displayOrder } = req.body;

        if (!config.jsonPath) {
            return res.status(400).json({ error: 'JSON path not configured' });
        }

        let data;
        try {
            data = await fs.readJson(config.jsonPath);
        } catch {
            data = { gods: [] };
        }

        if (data.gods.find(god => god.id === id)) {
            return res.status(400).json({ error: 'God ID already exists' });
        }

        let imageFileName = '';

        if (req.file) {
            const imageDir = path.join(__dirname, 'assets', 'images');
            await fs.ensureDir(imageDir);

            const imagePath = path.join(imageDir, req.file.originalname);
            await fs.copy(req.file.path, imagePath);
            await fs.remove(req.file.path);

            imageFileName = req.file.originalname;
        }

        const newGod = {
            id,
            name,
            imageFileName,
            displayOrder: parseInt(displayOrder) || 0,
            songs: []
        };

        data.gods.push(newGod);
        data.gods.sort((a, b) => a.displayOrder - b.displayOrder);

        await fs.writeJson(config.jsonPath, data, { spaces: 2 });

        res.json({ message: 'God added successfully', god: newGod });

    } catch (error) {
        console.error('Error adding god:', error);
        res.status(500).json({ error: 'Failed to add god' });
    }
});

app.post('/api/songs', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'lyricsTeluguFile', maxCount: 1 },
    { name: 'lyricsEnglishFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id, title, godId, languageDefault, duration, displayOrder } = req.body;

        if (!config.jsonPath) {
            return res.status(400).json({ error: 'JSON path not configured' });
        }

        let data;
        try {
            data = await fs.readJson(config.jsonPath);
        } catch {
            return res.status(400).json({ error: 'JSON file not found' });
        }

        const god = data.gods.find(g => g.id === godId);
        if (!god) {
            return res.status(400).json({ error: 'God not found' });
        }

        const allSongs = data.gods.flatMap(g => g.songs);
        if (allSongs.find(song => song.id === id)) {
            return res.status(400).json({ error: 'Song ID already exists' });
        }

        let audioFileName = '';
        let teluguLyricsFileName = '';
        let englishLyricsFileName = '';

        if (req.files) {
            if (req.files.audio && req.files.audio[0]) {
                const audioDir = path.join(__dirname, 'assets', 'audio');
                await fs.ensureDir(audioDir);

                const audioFile = req.files.audio[0];
                const audioPath = path.join(audioDir, audioFile.originalname);
                await fs.copy(audioFile.path, audioPath);
                await fs.remove(audioFile.path);

                audioFileName = audioFile.originalname;
            }

            if (req.files.lyricsTeluguFile && req.files.lyricsTeluguFile[0]) {
                const lyricsDir = path.join(__dirname, 'assets', 'lyrics', 'telugu');
                await fs.ensureDir(lyricsDir);

                const lyricsFile = req.files.lyricsTeluguFile[0];
                const lyricsPath = path.join(lyricsDir, lyricsFile.originalname);
                await fs.copy(lyricsFile.path, lyricsPath);
                await fs.remove(lyricsFile.path);

                teluguLyricsFileName = lyricsFile.originalname;
            }

            if (req.files.lyricsEnglishFile && req.files.lyricsEnglishFile[0]) {
                const lyricsDir = path.join(__dirname, 'assets', 'lyrics', 'english');
                await fs.ensureDir(lyricsDir);

                const lyricsFile = req.files.lyricsEnglishFile[0];
                const lyricsPath = path.join(lyricsDir, lyricsFile.originalname);
                await fs.copy(lyricsFile.path, lyricsPath);
                await fs.remove(lyricsFile.path);

                englishLyricsFileName = lyricsFile.originalname;
            }
        }

        const newSong = {
            id,
            title,
            godId,
            languageDefault: languageDefault || 'telugu',
            audioFileName,
            lyricsTeluguFileName: teluguLyricsFileName || null,
            lyricsEnglishFileName: englishLyricsFileName || null,
            duration: parseInt(duration) || 0,
            displayOrder: parseInt(displayOrder) || 0
        };

        god.songs.push(newSong);
        god.songs.sort((a, b) => a.displayOrder - b.displayOrder);

        await fs.writeJson(config.jsonPath, data, { spaces: 2 });

        res.json({ message: 'Song added successfully', song: newSong });

    } catch (error) {
        console.error('Error adding song:', error);
        res.status(500).json({ error: 'Failed to add song' });
    }
});

// Delete god endpoint
app.delete('/api/gods/:godId', async (req, res) => {
    try {
        const { godId } = req.params;

        if (!config.jsonPath) {
            return res.status(400).json({ error: 'JSON path not configured' });
        }

        let data;
        try {
            data = await fs.readJson(config.jsonPath);
        } catch {
            return res.status(400).json({ error: 'JSON file not found' });
        }

        const godIndex = data.gods.findIndex(g => g.id === godId);
        if (godIndex === -1) {
            return res.status(404).json({ error: 'God not found' });
        }

        const god = data.gods[godIndex];

        // Delete associated files
        if (god.imageFileName) {
            const imagePath = path.join(__dirname, 'assets', 'images', god.imageFileName);
            if (await fs.pathExists(imagePath)) {
                await fs.remove(imagePath);
            }
        }

        // Delete all song files for this god
        if (god.songs && god.songs.length > 0) {
            for (const song of god.songs) {
                // Delete audio file
                if (song.audioFileName) {
                    const audioPath = path.join(__dirname, 'assets', 'audio', song.audioFileName);
                    if (await fs.pathExists(audioPath)) {
                        await fs.remove(audioPath);
                    }
                }

                // Delete Telugu lyrics file
                if (song.lyricsTeluguFileName) {
                    const teluguPath = path.join(__dirname, 'assets', 'lyrics', 'telugu', song.lyricsTeluguFileName);
                    if (await fs.pathExists(teluguPath)) {
                        await fs.remove(teluguPath);
                    }
                }

                // Delete English lyrics file
                if (song.lyricsEnglishFileName) {
                    const englishPath = path.join(__dirname, 'assets', 'lyrics', 'english', song.lyricsEnglishFileName);
                    if (await fs.pathExists(englishPath)) {
                        await fs.remove(englishPath);
                    }
                }
            }
        }

        // Remove god from data
        data.gods.splice(godIndex, 1);

        await fs.writeJson(config.jsonPath, data, { spaces: 2 });

        res.json({ message: 'God and all associated songs deleted successfully' });

    } catch (error) {
        console.error('Error deleting god:', error);
        res.status(500).json({ error: 'Failed to delete god' });
    }
});

// Delete song endpoint
app.delete('/api/songs/:songId', async (req, res) => {
    try {
        const { songId } = req.params;

        if (!config.jsonPath) {
            return res.status(400).json({ error: 'JSON path not configured' });
        }

        let data;
        try {
            data = await fs.readJson(config.jsonPath);
        } catch {
            return res.status(400).json({ error: 'JSON file not found' });
        }

        let songFound = false;
        let songToDelete = null;

        // Find the song in any god's songs array
        for (const god of data.gods) {
            if (god.songs) {
                const songIndex = god.songs.findIndex(s => s.id === songId);
                if (songIndex !== -1) {
                    songToDelete = god.songs[songIndex];
                    god.songs.splice(songIndex, 1);
                    songFound = true;
                    break;
                }
            }
        }

        if (!songFound) {
            return res.status(404).json({ error: 'Song not found' });
        }

        // Delete associated files
        if (songToDelete.audioFileName) {
            const audioPath = path.join(__dirname, 'assets', 'audio', songToDelete.audioFileName);
            if (await fs.pathExists(audioPath)) {
                await fs.remove(audioPath);
            }
        }

        if (songToDelete.lyricsTeluguFileName) {
            const teluguPath = path.join(__dirname, 'assets', 'lyrics', 'telugu', songToDelete.lyricsTeluguFileName);
            if (await fs.pathExists(teluguPath)) {
                await fs.remove(teluguPath);
            }
        }

        if (songToDelete.lyricsEnglishFileName) {
            const englishPath = path.join(__dirname, 'assets', 'lyrics', 'english', songToDelete.lyricsEnglishFileName);
            if (await fs.pathExists(englishPath)) {
                await fs.remove(englishPath);
            }
        }

        await fs.writeJson(config.jsonPath, data, { spaces: 2 });

        res.json({ message: 'Song deleted successfully' });

    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});

// File browser endpoint for better path detection
app.post('/api/browse-file', (req, res) => {
    try {
        // This would work better in an Electron app or with additional file system access
        // For now, we'll return helpful path suggestions
        const os = require('os');
        const userHome = os.homedir();
        const desktop = path.join(userHome, 'Desktop');
        const documents = path.join(userHome, 'Documents');
        
        res.json({
            suggestions: {
                desktop: desktop,
                documents: documents,
                userHome: userHome
            },
            message: 'Use these common paths as reference'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get path suggestions' });
    }
});

// Start server
console.log('Starting Divine Blessing Admin Tool...');
const server = app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('🕉️  Divine Blessing Admin Tool');
    console.log('========================================');
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log('📱 Open your browser and visit the URL above');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('========================================');
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
    }
    process.exit(1);
});