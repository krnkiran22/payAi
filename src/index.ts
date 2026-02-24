import express from 'express';
import { config } from './config/envs';
import { startBot } from './bot/bot';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.PORT, () => {
    console.log(`📡 Backend server listening on port ${config.PORT}`);

    // Start the Telegram bot
    startBot();
});
