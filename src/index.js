const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { join } = require("path");
const conf = JSON.parse(fs.readFileSync('conf.json'));
const token = conf.key;
const serpApiKey = conf.serpApiKey;

const bot = new TelegramBot(token, { polling: true });

let teamName = null;
let intervalId = null;
let db;

async function openDatabase() {
    db = await open({
        filename: join(process.cwd(), 'football_info.db'),
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
    });
    console.log('Connessione al database avvenuta con successo');

    await db.run(`CREATE TABLE IF NOT EXISTS match_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        home_score INTEGER NOT NULL,
        away_score INTEGER NOT NULL,
        match_date TEXT NOT NULL
    );`);
    console.log("Database setup completato");
}

async function saveResults(homeTeam, awayTeam, homeScore, awayScore) {
    const query = `INSERT INTO match_results (home_team, away_team, home_score, away_score, match_date) VALUES (?, ?, ?, ?, ?)`;
    const matchDate = new Date();
    await db.run(query, [homeTeam, awayTeam, homeScore, awayScore, matchDate]);
}
async function fetchResults(team) {
    try {
        const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(team)}&location=austin,+texas,+united+states&api_key=${serpApiKey}`);
        const data = await response.json();

        const scores = data.sports_results.game_spotlight;

        if (!scores || scores.length === 0) {
            return 'Nessuna partita trovata.';
        }
        const homeTeam = scores.teams[0].name; 
        const awayTeam = scores.teams[1].name; 
        const homeScore = scores.teams[0].score; 
        const awayScore = scores.teams[1].score; 

        await saveResults(homeTeam, awayTeam, homeScore, awayScore);

        return `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
    } catch (error) {
        console.error('la squadra che hai inserito non è valida perchè deve ancora giocare.', error);
        return 'la squadra che hai inserito non è valida perchè deve ancora giocare.';
    }
}

function startSendingResults(chatId) {
    if (intervalId) {
        clearInterval(intervalId); 
    }

    intervalId = setInterval(async () => {
        if (teamName) {
            const results = await fetchResults(teamName);
            bot.sendMessage(chatId, results);
        }
    }, 600000); 
}

function stopSendingResults() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

(async () => {
    await openDatabase();
    bot.on("message", (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        if (text === "/start") {
            bot.sendMessage(chatId, "Benvenuto! Per favore, inviami il nome della squadra di calcio che sta giocando o della quale vuoi sapere l'ultimo risultato .");
        } else if (text === "/stop") {
            stopSendingResults();
            teamName = null; 
            bot.sendMessage(chatId, "Hai fermato l'invio dei risultati.");
        } else {
            teamName = text; 
            bot.sendMessage(chatId, `Hai selezionato: ${teamName}. Ora ti invierò i risultati ogni 5 minuti.`);
            startSendingResults(chatId); 
        }
    });
})();
