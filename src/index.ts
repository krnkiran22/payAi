import express from 'express';
console.log('🚀 Starting PayAI Application...');
import { config } from './config/envs.js';
import { startBot } from './bot/bot.js';
import { DriveService } from './services/drive.service.js';
import { GroqService } from './services/groq.service.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.PORT, async () => {
    console.log(`📡 Backend server listening on port ${config.PORT}`);

    // Startup Checks
    console.log('🔍 Testing Cloud Services...');
    try {
        // Test Drive Service
        await DriveService.setupDirectoryStructure('test_user', 'other');
        console.log('✅ Google Drive: Connected & Configured');
    } catch (err) {
        console.error('❌ Google Drive connection test failed:', err instanceof Error ? err.message : err);
    }

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

