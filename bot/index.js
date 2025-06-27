const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { setupFirestoreListener } = require('./events/firestoreListener');

require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.name === 'firestoreListener') continue;
    const eventHandler = (...args) => event.execute(...args, db);

    if (event.once) {
        client.once(event.name, eventHandler);
    } else {
        client.on(event.name, eventHandler);
    }
}

if (!BOT_TOKEN) {
    console.error("ERROR: DISCORD_BOT_TOKEN is not set. Please check your .env.local file in the /bot directory.");
} else {
    client.login(BOT_TOKEN).then(() => {
        setupFirestoreListener(db, client);
    });
}

module.exports = { db };
