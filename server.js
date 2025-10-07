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

// Helper function to generate version timestamp
function generateVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Helper function to generate God ID from name
function generateGodId(name, existingGods = []) {
    const baseId = "god_" + name.toLowerCase().replace(/\s+/g, "_");

    // Check if ID already exists
    const existingIds = existingGods.map(god => god.id);
    if (!existingIds.includes(baseId)) {
        return baseId;
    }

    // If duplicate, add random suffix
    let attempts = 0;
    while (attempts < 100) {
        const suffix = Math.floor(Math.random() * 999) + 1;
        const newId = `${baseId}_${suffix}`;
        if (!existingIds.includes(newId)) {
            return newId;
        }
        attempts++;
    }

    // Fallback with timestamp
    return `${baseId}_${Date.now()}`;
}

// Helper function to generate Song ID
function generateSongId(parentGodId, existingGods = []) {
    const godName = parentGodId.replace("god_", "");
    const timestamp = generateVersion();
    const baseId = `song_${godName}_${timestamp}`;

    // Check if ID already exists across all songs
    const allSongs = existingGods.flatMap(god => god.songs || []);
    const existingIds = allSongs.map(song => song.id);

    if (!existingIds.includes(baseId)) {
        return baseId;
    }

    // If duplicate, add random suffix
    let attempts = 0;
    while (attempts < 100) {
        const suffix = Math.floor(Math.random() * 999) + 1;
        const newId = `${baseId}_${suffix}`;
        if (!existingIds.includes(newId)) {
            return newId;
        }
        attempts++;
    }

    // Fallback with additional timestamp
    return `${baseId}_${Date.now()}`;
}

// Helper function to update version and save JSON data
async function saveDataWithVersion(filePath, data) {
    try {
        // Update version timestamp
        data.version = generateVersion();

        // Ensure gods array exists
        if (!data.gods) {
            data.gods = [];
        }

        // Check if file exists before saving
        if (!fs.existsSync(filePath)) {
            throw new Error(`JSON file not found: "${filePath}"`);
        }

        // Write to file with proper formatting
        await fs.writeJson(filePath, data, { spaces: 2 });

        console.log(`✅ Data saved with version: ${data.version}`);
        return data;
    } catch (error) {
        console.error(`❌ Error saving data:`, error);
        throw error;
    }
}

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

    // Helper function to clean and validate paths (NO AUTO-CREATION)
    function cleanPath(inputPath) {
        if (!inputPath || inputPath.trim() === '') {
            return null;
        }

        let cleanedPath = inputPath.trim();

        // Remove quotes if present (handle both single and double quotes)
        if ((cleanedPath.startsWith('"') && cleanedPath.endsWith('"')) ||
            (cleanedPath.startsWith("'") && cleanedPath.endsWith("'"))) {
            cleanedPath = cleanedPath.slice(1, -1);
        }

        // Normalize path separators
        cleanedPath = path.normalize(cleanedPath);

        // Make absolute if not already
        if (!path.isAbsolute(cleanedPath)) {
            cleanedPath = path.resolve(cleanedPath);
        }

        return cleanedPath;
    }

    // Use default paths if empty
    const defaultJsonPath = path.join(__dirname, 'assets', 'gods_songs.json');
    const defaultAndroidPath = path.join(__dirname, 'assets');

    const finalJsonPath = cleanPath(jsonPath) || defaultJsonPath;
    const finalAndroidPath = cleanPath(androidProjectPath) || defaultAndroidPath;

    console.log(`📁 Checking JSON path: "${finalJsonPath}"`);
    console.log(`📁 Checking Android path: "${finalAndroidPath}"`);

    // Check if JSON file exists (DO NOT CREATE)
    if (!fs.existsSync(finalJsonPath)) {
        console.log(`❌ JSON file not found: "${finalJsonPath}"`);
        return res.status(400).json({
            error: `JSON file not found at: "${finalJsonPath}". Please ensure the file exists or use a different path.`,
            suggestion: 'Make sure the path is correct and the file exists. The system will not create files automatically.'
        });
    }

    // Check if Android directory exists (DO NOT CREATE)
    if (!fs.existsSync(finalAndroidPath)) {
        console.log(`❌ Android directory not found: "${finalAndroidPath}"`);
        return res.status(400).json({
            error: `Android directory not found at: "${finalAndroidPath}". Please ensure the directory exists or use a different path.`,
            suggestion: 'Make sure the path is correct and the directory exists. The system will not create directories automatically.'
        });
    }

    // Try to read and validate the JSON file
    try {
        console.log(`📖 Reading JSON file: "${finalJsonPath}"`);
        let data;
        const fileContent = fs.readFileSync(finalJsonPath, 'utf8').trim();

        if (fileContent === '') {
            console.log(`❌ JSON file is empty: "${finalJsonPath}"`);
            return res.status(400).json({
                error: `JSON file is empty: "${finalJsonPath}". Please add valid JSON content to the file.`,
                suggestion: 'The file should contain at least: {"version": "20241008000000", "gods": []}'
            });
        } else {
            // Try to parse existing content
            data = JSON.parse(fileContent);
            console.log(`✅ JSON file is valid and readable`);

            // Ensure it has the required structure
            if (!data.gods) {
                console.log(`⚠️  JSON file missing 'gods' array, but file is valid`);
            }
        }
    } catch (error) {
        console.log(`❌ Invalid JSON file: "${finalJsonPath}"`);
        return res.status(400).json({
            error: `Invalid JSON file: ${error.message}. Please ensure the file contains valid JSON.`,
            suggestion: 'Check the JSON syntax in your file. You can use an online JSON validator.'
        });
    }

    // All validations passed
    config.jsonPath = finalJsonPath;
    config.androidProjectPath = finalAndroidPath;

    console.log(`✅ Configuration updated successfully`);
    console.log(`✅ JSON path: "${finalJsonPath}"`);
    console.log(`✅ Android path: "${finalAndroidPath}"`);

    res.json({
        message: 'Configuration updated successfully! Both paths are valid and accessible.',
        config: {
            jsonPath: finalJsonPath,
            androidProjectPath: finalAndroidPath
        },
        info: 'Files and directories must exist - no automatic creation'
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
            const emptyData = {
                version: generateVersion(),
                gods: []
            };
            res.json(emptyData);
            return;
        }

        const data = JSON.parse(fileContent);

        // Ensure data has the required structure
        if (!data.gods) {
            data.gods = [];
        }

        // Add version if missing (for backward compatibility)
        if (!data.version) {
            data.version = generateVersion();
        }

        res.json(data);
    } catch (error) {
        console.error('Error reading JSON file:', error);
        // Return empty structure if file is corrupted
        const emptyData = {
            version: generateVersion(),
            gods: []
        };
        res.json(emptyData);
    }
});

app.post('/api/gods', upload.single('image'), async (req, res) => {
    try {
        const { name, displayOrder } = req.body; // Removed id from destructuring

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'God name is required' });
        }

        if (!config.jsonPath) {
            return res.status(400).json({ error: 'JSON path not configured' });
        }

        let data;
        try {
            data = await fs.readJson(config.jsonPath);
            // Ensure version exists for backward compatibility
            if (!data.version) {
                data.version = generateVersion();
            }
        } catch {
            data = {
                version: generateVersion(),
                gods: []
            };
        }

        // Auto-generate ID and add "Lord" prefix to name
        const autoId = generateGodId(name.trim(), data.gods);
        const autoName = `Lord ${name.trim()}`;

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
            id: autoId,
            name: autoName,
            imageFileName,
            displayOrder: parseInt(displayOrder) || 0,
            songs: []
        };

        data.gods.push(newGod);
        data.gods.sort((a, b) => a.displayOrder - b.displayOrder);

        await saveDataWithVersion(config.jsonPath, data);

        console.log(`✅ God added: ID="${autoId}", Name="${autoName}"`);
        res.json({
            message: 'God added successfully',
            god: newGod,
            autoGenerated: {
                id: autoId,
                name: autoName
            }
        });

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
        const { title, godId, languageDefault, duration, displayOrder } = req.body; // Removed id from destructuring

        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Song title is required' });
        }

        if (!godId) {
            return res.status(400).json({ error: 'God ID is required' });
        }

        if (!config.jsonPath) {
            return res.status(400).json({ error: 'JSON path not configured' });
        }

        let data;
        try {
            data = await fs.readJson(config.jsonPath);
            // Ensure version exists for backward compatibility
            if (!data.version) {
                data.version = generateVersion();
            }
        } catch {
            return res.status(400).json({ error: 'JSON file not found' });
        }

        const god = data.gods.find(g => g.id === godId);
        if (!god) {
            return res.status(400).json({ error: 'God not found' });
        }

        // Auto-generate song ID
        const autoId = generateSongId(godId, data.gods);

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
            id: autoId,
            title: title.trim(),
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

        await saveDataWithVersion(config.jsonPath, data);

        console.log(`✅ Song added: ID="${autoId}", Title="${title.trim()}"`);
        res.json({
            message: 'Song added successfully',
            song: newSong,
            autoGenerated: {
                id: autoId
            }
        });

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
            // Ensure version exists for backward compatibility
            if (!data.version) {
                data.version = generateVersion();
            }
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

        await saveDataWithVersion(config.jsonPath, data);

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
            // Ensure version exists for backward compatibility
            if (!data.version) {
                data.version = generateVersion();
            }
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

        await saveDataWithVersion(config.jsonPath, data);

        res.json({ message: 'Song deleted successfully' });

    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});

// Preview auto-generated values endpoint
app.post('/api/preview-god', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.json({
                id: '',
                name: ''
            });
        }

        let data = { gods: [] };
        if (config.jsonPath && fs.existsSync(config.jsonPath)) {
            try {
                data = await fs.readJson(config.jsonPath);
            } catch (error) {
                // Use empty data if file can't be read
            }
        }

        const previewId = generateGodId(name.trim(), data.gods);
        const previewName = `Lord ${name.trim()}`;

        res.json({
            id: previewId,
            name: previewName
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

// Preview song ID endpoint
app.post('/api/preview-song', async (req, res) => {
    try {
        const { godId } = req.body;

        if (!godId) {
            return res.json({ id: '' });
        }

        let data = { gods: [] };
        if (config.jsonPath && fs.existsSync(config.jsonPath)) {
            try {
                data = await fs.readJson(config.jsonPath);
            } catch (error) {
                // Use empty data if file can't be read
            }
        }

        const previewId = generateSongId(godId, data.gods);

        res.json({
            id: previewId
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate song preview' });
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