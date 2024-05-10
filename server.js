const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

// Create database
const db = new sqlite3.Database('./languageData.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Database connected.');
        db.run(`CREATE TABLE IF NOT EXISTS Results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Текст TEXT NOT NULL,
            Язык TEXT,
            Кол_во_символов_кириллицы INTEGER,
            Кол_во_латинских_символов INTEGER
        )`, (err) => {
            if (err) {
                console.error("Error creating table", err.message);
            } else {
                console.log("Results table is ready.");
            }
        });
    }
});


app.post('/detect', (req, res) => {
    const text = req.body.text;
    const saveToDB = req.body.saveToDB;
    const result = detectLanguageAndSymbols(text);

    if (saveToDB) {
        db.run(`INSERT INTO Results (Текст, Язык, Кол_во_символов_кириллицы, Кол_во_латинских_символов) VALUES (?, ?, ?, ?)`, 
               [result.text, result.language, result.countCyrillic, result.countLatin], function(err) {
            if (err) {
                res.status(500).json({ error: 'Failed to save in database' });
            } else {
                res.json({ message: 'Detection complete', id: this.lastID, result });
            }
        });
    } else {
        res.json({ message: 'Detection complete', result });
    }
});

function detectLanguageAndSymbols(text) {
    const cyrillicPattern = /[\u0400-\u04FF]/g;
    const latinPattern = /[A-Za-z]/g;

    const cyrillicMatches = text.match(cyrillicPattern);
    const latinMatches = text.match(latinPattern);

    const countCyrillic = cyrillicMatches ? cyrillicMatches.length : 0;
    const countLatin = latinMatches ? latinMatches.length : 0;

    let language;

    if (countCyrillic > countLatin) {
        language = 'Русский';
    } else if (countLatin > countCyrillic) {
        language = 'Английский';
    } else {
        if (countCyrillic === 0 && countLatin === 0) {
            language = 'Неизвестный';
        } else {
            language = 'Смешанный';
        }
    }

    return { text, language, countCyrillic, countLatin };
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
