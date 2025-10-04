#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');

// Global variable to store JSON path
let jsonFilePath = null;

// Load JSON from file
function loadJSON(filePath) {
    if (!fs.existsSync(filePath)) return { gods: [] };
    return fs.readJsonSync(filePath);
}

// Save JSON to file
function saveJSON(filePath, data) {
    fs.writeJsonSync(filePath, data, { spaces: 2 });
}

// Add God to JSON
function addGod(json, godData) {
    if (json.gods.find(g => g.id === godData.id)) {
        throw new Error('God ID already exists!');
    }
    godData.songs = [];
    json.gods.push(godData);
}

// Add Song to a specific God
function addSong(json, godId, songData) {
    const god = json.gods.find(g => g.id === godId);
    if (!god) throw new Error('God not found!');
    if (god.songs.find(s => s.id === songData.id)) {
        throw new Error('Song ID already exists for this god!');
    }
    god.songs.push(songData);
}

// Copy asset file to target folder and return the new file name
function copyAsset(srcFile, destFolder) {
    if (!fs.existsSync(srcFile)) throw new Error(`Source file not found: ${srcFile}`);
    fs.ensureDirSync(destFolder);
    const fileName = path.basename(srcFile);
    const dest = path.join(destFolder, fileName);
    fs.copyFileSync(srcFile, dest);
    return fileName;
}

// Main menu
async function mainMenu() {
    const choices = ['Set JSON Path', 'Add God', 'Add Song', 'Exit'];
    const { action } = await inquirer.prompt({
        name: 'action',
        type: 'list',
        message: 'Choose action:',
        choices
    });
    return action;
}

// Set JSON path
async function setJSONPath() {
    const { pathInput } = await inquirer.prompt({
        name: 'pathInput',
        type: 'input',
        message: 'Enter full path to the JSON file (e.g., /path/to/gods_songs.json):'
    });
    jsonFilePath = pathInput;
    if (!fs.existsSync(jsonFilePath)) {
        fs.writeJsonSync(jsonFilePath, { gods: [] }, { spaces: 2 });
        console.log('JSON file created at:', jsonFilePath);
    } else {
        console.log('JSON file set to:', jsonFilePath);
    }
}

// Add God workflow
async function workflowAddGod() {
    if (!jsonFilePath) {
        console.log('Please set JSON path first!');
        return;
    }
    const json = loadJSON(jsonFilePath);

    const answers = await inquirer.prompt([
        { name: 'id', type: 'input', message: 'God ID (unique, e.g., god_shiva):' },
        { name: 'name', type: 'input', message: 'God Display Name:' },
        { name: 'displayOrder', type: 'number', message: 'Display Order (integer):', default: 1 },
        { name: 'imageFile', type: 'input', message: 'Path to God Image File:' }
    ]);

    // Copy image file to Android assets/images/gods/
    const imageFileName = copyAsset(answers.imageFile, path.join(__dirname, 'assets/images/gods'));

    // Create God object
    const godData = {
        id: answers.id,
        name: answers.name,
        imageFileName,
        displayOrder: answers.displayOrder,
        songs: []
    };

    addGod(json, godData);
    saveJSON(jsonFilePath, json);
    console.log(`God "${answers.name}" added successfully!`);
}

// Add Song workflow
async function workflowAddSong() {
    if (!jsonFilePath) {
        console.log('Please set JSON path first!');
        return;
    }
    const json = loadJSON(jsonFilePath);

    if (json.gods.length === 0) {
        console.log('No gods found. Please add a God first.');
        return;
    }

    const { godId } = await inquirer.prompt({
        name: 'godId',
        type: 'list',
        message: 'Select God for this song:',
        choices: json.gods.map(g => ({ name: g.name, value: g.id }))
    });

    const answers = await inquirer.prompt([
        { name: 'id', type: 'input', message: 'Song ID (unique, e.g., song_shiva_1):' },
        { name: 'title', type: 'input', message: 'Song Title:' },
        { name: 'languageDefault', type: 'list', message: 'Default Language:', choices: ['telugu', 'english'], default: 'telugu' },
        { name: 'audioFile', type: 'input', message: 'Path to Audio File:' },
        { name: 'lyricsTelugu', type: 'input', message: 'Path to Telugu Lyrics File (.lrc or .txt):', default: '' },
        { name: 'lyricsEnglish', type: 'input', message: 'Path to English Lyrics File (.lrc or .txt):', default: '' },
        { name: 'duration', type: 'number', message: 'Duration in milliseconds:', default: 0 },
        { name: 'displayOrder', type: 'number', message: 'Display Order (integer):', default: 1 }
    ]);

    // Copy files to respective assets folders
    const audioFileName = copyAsset(answers.audioFile, path.join(__dirname, 'assets/audio'));
    const lyricsTeluguFileName = answers.lyricsTelugu ? copyAsset(answers.lyricsTelugu, path.join(__dirname, 'assets/lyrics/telugu')) : null;
    const lyricsEnglishFileName = answers.lyricsEnglish ? copyAsset(answers.lyricsEnglish, path.join(__dirname, 'assets/lyrics/english')) : null;

    // Create Song object
    const songData = {
        id: answers.id,
        title: answers.title,
        godId: godId,
        languageDefault: answers.languageDefault,
        audioFileName,
        lyricsTeluguFileName,
        lyricsEnglishFileName,
        duration: answers.duration,
        displayOrder: answers.displayOrder
    };

    addSong(json, godId, songData);
    saveJSON(jsonFilePath, json);
    console.log(`Song "${answers.title}" added successfully under God "${json.gods.find(g => g.id === godId).name}"`);
}

// Main loop
async function main() {
    console.log('=== Divine Blessing Admin Tool ===');
    while (true) {
        const action = await mainMenu();
        try {
            switch (action) {
                case 'Set JSON Path': await setJSONPath(); break;
                case 'Add God': await workflowAddGod(); break;
                case 'Add Song': await workflowAddSong(); break;
                case 'Exit': console.log('Goodbye!'); process.exit(0);
            }
        } catch (err) {
            console.error('Error:', err.message);
        }
    }
}

// Run the tool
main();
