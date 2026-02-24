import fs from 'fs';
import { config } from '../config/envs.js';

/**
 * Utility to handle Google Service Account JSON.
 */
export const getGoogleAuth = () => {
    let rawString = config.GOOGLE_SERVICE_ACCOUNT_JSON || '';

    if (!rawString.trim()) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is empty.");
    }

    // Attempt to find the JSON object within the string
    const startIndex = rawString.indexOf('{');
    const endIndex = rawString.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        throw new Error("Could not find a valid JSON object in GOOGLE_SERVICE_ACCOUNT_JSON.");
    }

    let jsonPart = rawString.substring(startIndex, endIndex + 1);

    // SANITIZATION:
    // 1. Replace smart quotes
    // 2. Remove hidden characters
    // 3. Fix backslashes: Escape backslashes that are NOT valid JSON escapes
    // Valid escapes are: \", \\, \/, \b, \f, \n, \r, \t, \u
    // We also fix the common " \x " issue seen in logs
    jsonPart = jsonPart
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/\\x/g, '\\\\x') // Fix the specific \x issue
        .replace(/\\(?![ "bfnrtu\/\\])/g, '\\\\'); // Escape any other rogue backslashes

    try {
        return JSON.parse(jsonPart);
    } catch (err: any) {
        // Log deep detail for the user
        const posMatch = err.message.match(/position (\d+)/);
        if (posMatch) {
            const pos = parseInt(posMatch[1]);
            console.error(`--- JSON FATAL ERROR at ${pos} ---`);
            console.error(`Char: '${jsonPart[pos]}' (Code: ${jsonPart.charCodeAt(pos)})`);
            console.error(`Context: ${jsonPart.substring(Math.max(0, pos - 10), pos + 10)}`);
        }
        throw new Error(`Google JSON Parse Error: ${err.message}`);
    }
};
