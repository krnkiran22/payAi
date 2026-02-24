import fs from 'fs';
import { config } from '../config/envs.js';

/**
 * Utility to handle Google Service Account JSON.
 * On Local: Reads from file path.
 * On Render: Can read from a raw string in ENV to avoid file system issues.
 */
export const getGoogleAuth = () => {
    let rawJson = config.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

    if (!rawJson) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is empty.");
    }

    // If the string starts with '{', it's likely a raw JSON string
    if (rawJson.startsWith('{')) {
        try {
            return JSON.parse(rawJson);
        } catch (err) {
            throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON as JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    // Otherwise treat as file path
    if (fs.existsSync(rawJson)) {
        try {
            return JSON.parse(fs.readFileSync(rawJson, 'utf8'));
        } catch (err) {
            throw new Error(`Failed to read or parse Google JSON file at ${rawJson}`);
        }
    }

    throw new Error(`Google Service Account JSON not found (Check if it's a valid path or raw JSON string).`);
};
