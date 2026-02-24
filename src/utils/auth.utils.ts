import fs from 'fs';
import { config } from '../config/envs.js';

/**
 * Utility to handle Google Service Account JSON.
 * On Local: Reads from file path.
 * On Render: Can read from a raw string in ENV to avoid file system issues.
 */
export const getGoogleAuth = () => {
    const jsonPath = config.GOOGLE_SERVICE_ACCOUNT_JSON;

    // If the path looks like a JSON string (for Render/Prod env vars)
    if (jsonPath.startsWith('{')) {
        return JSON.parse(jsonPath);
    }

    // Otherwise read from file
    if (fs.existsSync(jsonPath)) {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    throw new Error(`Google Service Account JSON not found at ${jsonPath} and is not a valid JSON string.`);
};
