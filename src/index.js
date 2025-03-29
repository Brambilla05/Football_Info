const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const conf = JSON.parse(fs.readFileSync('conf.json'));
const token = conf.key;

const bot = new TelegramBot(token, { polling: true });

bot.on("message", (msg) => {
   const chatId = msg.chat.id;
   const text = msg.text;

   if (text === "/start") {
      bot.sendMessage(chatId, "Hello world");
   }
   
});