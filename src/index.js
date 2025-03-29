const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch'); 
const conf = JSON.parse(fs.readFileSync('conf.json'));
const token = conf.key;
const apiToken = conf.apiToken; 

const bot = new TelegramBot(token, { polling: true });

let teamName = null;
let intervalId = null;

async function fetchResults(team) {
    try {
        const response = await fetch(`https://api.football-data.org/v2/teams/${team}/matches`, {
            headers: {
                'X-Auth-Token': apiToken 
            }
        });
        const data = await response.json();
        if (!data.matches || data.matches.length === 0) {
            return 'Nessuna partita trovata.';
        }
        const matches = data.matches.map(match => {
            return `${match.homeTeam.name} vs ${match.awayTeam.name}: ${match.score.fullTime.home} - ${match.score.fullTime.away}`;
        }).join('\n');

        return matches;
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
    }, 9000); 
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
        bot.sendMessage(chatId, `Hai selezionato: ${teamName}. Ora ti invierò i risultati ogni 30 minuti.`);
        startSendingResults(chatId); 
    }
});