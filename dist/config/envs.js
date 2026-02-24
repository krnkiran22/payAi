import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
export const config = {
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',
    APPROVED_USERS: (process.env.APPROVED_USERS || 'fredrikparker,john,rahul').split(','),
    TEMP_DIR: path.join(process.cwd(), 'tmp'),
};
if (!config.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL is not set');
}
if (!config.TELEGRAM_BOT_TOKEN) {
    console.warn('WARNING: TELEGRAM_BOT_TOKEN is not set');
}
