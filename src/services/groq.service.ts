import OpenAI from 'openai';
import { config } from '../config/envs.js';
import fs from 'fs';

export interface ExtractedData {
    amount: number;
    currency: string;
    vendor: string;
    expense_date: string;
    payment_method: string;
    category_hint: string;
    notes: string;
}

export class GroqService {
    private static _clients: any[] = [];
    private static _currentIndex = 0;

    private static get client() {
        if (this._clients.length === 0) {
            if (config.GROQ_API_KEYS.length === 0) {
                console.warn('⚠️ No GROQ API keys set.');
                return null;
            }
            this._clients = config.GROQ_API_KEYS.map(key => new OpenAI({
                apiKey: key,
                baseURL: 'https://api.groq.com/openai/v1',
            }));
        }
        return this._clients[this._currentIndex];
    }

    private static rotateKey() {
        if (this._clients.length > 1) {
            this._currentIndex = (this._currentIndex + 1) % this._clients.length;
            console.log(`🔄 Rotated to Groq API Key index ${this._currentIndex}`);
        }
    }

    private static async runWithRetry(fn: (client: any) => Promise<any>): Promise<any> {
        let attempts = 0;
        const maxAttempts = this._clients.length > 0 ? this._clients.length : 1;

        while (attempts < maxAttempts) {
            const currentClient = this.client;
            if (!currentClient) throw new Error('No client available');

            try {
                return await fn(currentClient);
            } catch (err: any) {
                if (err?.status === 429 || err?.message?.includes('rate limit') || err?.status === 401) {
                    console.warn(`🛑 Key index ${this._currentIndex} exhausted or invalid. Rotating...`);
                    this.rotateKey();
                    attempts++;
                } else {
                    throw err;
                }
            }
        }
        throw new Error('All Groq API keys exhausted or failed.');
    }

    /**
     * Parse bill data using specialized Groq Responses API
     */
    static async analyzeImage(imagePath: string): Promise<{ data: ExtractedData; raw: string }> {
        // Since vision models seem to have changed, we'll use OCR + the powerful gpt-oss-20b model as requested
        // unless we can confirm a vision model. 
        // For now, let's use the pattern requested by the user.
        throw new Error("Vision model decommissioned. Falling back to OCR processing...");
    }

    static async parseBill(ocrText: string): Promise<{ data: ExtractedData; raw: string }> {
        const prompt = `CONTEXT: ${config.GOAL_CONTEXT}
Extract bill data as JSON:
{
  "amount": 0,
  "currency": "INR",
  "vendor": "string",
  "expense_date": "YYYY-MM-DD",
  "payment_method": "UPI",
  "category_hint": "other",
  "notes": "string"
}

OCR TEXT:
[${ocrText}]`;

        try {
            const response = await this.runWithRetry((client) => client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: prompt,
            }));

            const content = response.output_text || '{}';
            // Clean content (sometimes models wrap in markdown)
            const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
            const parsed = JSON.parse(jsonStr);

            return {
                data: {
                    amount: parseFloat(parsed.amount) || 0,
                    currency: parsed.currency || 'INR',
                    vendor: parsed.vendor || 'Unknown',
                    expense_date: parsed.expense_date || new Date().toISOString().split('T')[0],
                    payment_method: parsed.payment_method || 'unknown',
                    category_hint: parsed.category_hint || 'other',
                    notes: parsed.notes || '',
                },
                raw: content,
            };
        } catch (error: any) {
            console.error('Parse Bill Error:', error);
            throw new Error(`Text parsing failed: ${error?.message}`);
        }
    }

    static async chat(message: string): Promise<string> {
        try {
            const response = await this.runWithRetry((client) => client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: `You are PotatoBot, a savage, funny, and edgy Telegram bot. 
CONTEXT: ${config.GOAL_CONTEXT}
The user said: "${message}". 
Reply to them in a devastatingly funny and savage way. Keep it short. Ensure you occasionally remind them of the March 7 goal if relevant.`,
            }));
            return response.output_text || "I'm speechless at your stupidity.";
        } catch (error) {
            console.error('Chat Error:', error);
            return "I'm busy. Come back when you have a brain.";
        }
    }

    static async parseUpdate(text: string): Promise<{ total: number, using: number, notUsing: number, factory: string } | null> {
        const prompt = `CONTEXT: ${config.GOAL_CONTEXT}
Extract factory update data from this message: "${text}".
Return ONLY JSON:
{
  "total": number,
  "using": number,
  "notUsing": number,
  "factory": "string"
}
If numbers are missing, calculate (total = using + notUsing).`;

        try {
            const response = await this.runWithRetry((client) => client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: prompt,
            }));

            const content = response.output_text || '{}';
            const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Update Parse Error:', error);
            return null;
        }
    }
}
