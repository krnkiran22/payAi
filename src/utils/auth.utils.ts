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
        throw new Error("Could not find a valid JSON object (starting with { and ending with }) in GOOGLE_SERVICE_ACCOUNT_JSON.");
    }

    let jsonPart = rawString.substring(startIndex, endIndex + 1);
    console.error(`--- JSON PARSE START: Length ${jsonPart.length} chars ---`);
    console.error(`--- BOUNDARIES: '${jsonPart.substring(0, 5)}' ... '${jsonPart.substring(jsonPart.length - 5)}' ---`);

    // Sanitize: Replace fancy quotes, hidden characters, and bad newlines
    jsonPart = jsonPart
        .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
        .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero width spaces
        .replace(/\u00A0/g, ' '); // Non-breaking spaces

    try {
        return JSON.parse(jsonPart);
    } catch (err: any) {
        // Last ditch effort: Try to handle literal newlines that aren't escaped
        try {
            // Replace actual newlines inside the string with escaped \n for the parser
            // Note: This is tricky because we don't want to break the JSON syntax itself
            const repaired = jsonPart.replace(/\r?\n/g, '\\n');
            // This is actually incorrect for the whole JSON, only works for strings.
            // Let's try instead to just parse the original with a cleaner approach.

            // If it still fails, log the char code at the error position
            const match = err.message.match(/position (\d+)/);
            if (match) {
                const pos = parseInt(match[1]);
                const charCode = jsonPart.charCodeAt(pos);
                console.error(`--- JSON PARSE DEBUG ---`);
                console.error(`Error at position ${pos}. Char code: ${charCode}. Char: '${jsonPart[pos]}'`);
                console.error(`Context: ...${jsonPart.substring(Math.max(0, pos - 5), pos + 5)}...`);
            }

            return JSON.parse(jsonPart);
        } catch (finalErr: any) {
            throw new Error(`Google JSON Syntax Error: ${finalErr.message}. Position: ${finalErr.message.match(/position (\d+)/)?.[1] || 'unknown'}`);
        }
    }
};
