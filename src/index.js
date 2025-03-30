const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch'); 
const conf = JSON.parse(fs.readFileSync('conf.json'));
const token = conf.key;
const serpApiKey = conf.serpApiKey; 

const bot = new TelegramBot(token, { polling: true });

let teamName = null;
let intervalId = null;

async function fetchResults(team) {
    try {
        const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(team)}&location=austin,+texas,+united+states&api_key=${serpApiKey}`);
        const data = await response.json();

        const scores = data.sports_results.game_spotlight;

        if (!scores || scores.length === 0) {
            return 'Nessuna partita trovata.';
        }
console.log(scores.teams);
 
            const homeTeam = scores.teams[0].name; 
            const awayTeam = scores.teams[1].name; 
            const homeScore = scores.teams[0].score; 
            const awayScore = scores.teams[1].score; 

            return `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
    } catch (error) {
        console.error('Errore nel recupero dei risultati:', error);
        return 'Errore nel recupero dei risultati.';
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
    }, 5000); 
}

function stopSendingResults() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text === "/start") {
        bot.sendMessage(chatId, "Benvenuto! Per favore, inviami il nome della tua squadra di calcio.");
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