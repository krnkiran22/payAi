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

    // Remove stray quotes that sometimes appear from copy-pasting into Render UI
    if (rawJson.startsWith('"') && rawJson.endsWith('"')) {
        rawJson = rawJson.slice(1, -1);
    }

    // If the string starts with '{', it's likely a raw JSON string
    if (rawJson.startsWith('{')) {
        try {
            // Attempt 1: Standard parse
            return JSON.parse(rawJson);
        } catch (err) {
            try {
                // Attempt 2: Fix common escaping issues
                // 1. Replace literal newlines with escaped versions
                // 2. Escape backslashes that are not already escaping something valid in JSON strings
                const fixedJson = rawJson
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

                return JSON.parse(fixedJson);
            } catch (err2) {
                console.error('--- DEBUG: JSON PARSE FAILURE ---');
                console.error('Original Raw String (First 100 chars):', rawJson.substring(0, 100));
                console.error('Error at Position:', (err2 as any).message);

                throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. 
The JSON is malformed. This usually happens when the Private Key is not properly escaped in Render.
Try pasting it again or use a "Secret File" on Render.
Internal Error: ${(err2 as any).message}`);
            }
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
