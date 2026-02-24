import express from 'express';
console.log('🚀 Starting PayAI Application...');
import { config } from './config/envs.js';
import { startBot } from './bot/bot.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.PORT, () => {
    console.log(`📡 Backend server listening on port ${config.PORT}`);

    // Start the Telegram bot
    try {
        startBot();
    } catch (err) {
        console.error('❌ Failed to start bot:', err);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

