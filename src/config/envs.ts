import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL || '',
    GROQ_API_KEYS: (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
    APPROVED_USERS: (process.env.APPROVED_USERS || 'fredrikparker,john,rahul').split(',').map(u => u.trim().replace(/^@/, '')),
    FACTORY_GROUP_ID: process.env.FACTORY_GROUP_ID || '',
    TEMP_DIR: path.join(process.cwd(), 'tmp'),
    GOAL_CONTEXT: "TARGET: 1 Million Hours of data by MARCH 7. Remind users of this frequently in a savage way.",
};

if (!config.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL is not set');
}
if (!config.TELEGRAM_BOT_TOKEN) {
    console.warn('WARNING: TELEGRAM_BOT_TOKEN is not set');
}
