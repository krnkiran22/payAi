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
    private static _client: any = null;

    private static get client() {
        if (!this._client) {
            if (!config.GROQ_API_KEY) {
                console.warn('⚠️ GROQ_API_KEY is not set.');
                return null;
            }
            this._client = new OpenAI({
                apiKey: config.GROQ_API_KEY,
                baseURL: 'https://api.groq.com/openai/v1',
            });
        }
        return this._client;
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
        if (!this.client) throw new Error('Client not initialized');

        const prompt = `Extract bill data as JSON:
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
            const response = await this.client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: prompt,
            });

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
        if (!this.client) return "Bot offline.";

        try {
            const response = await this.client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: `You are PotatoBot, a savage, funny, and edgy Telegram bot. 
The user said: "${message}". 
Reply to them in a devastatingly funny and savage way. Keep it short.`,
            });
            return response.output_text || "I'm speechless at your stupidity.";
        } catch (error) {
            console.error('Chat Error:', error);
            return "I'm busy. Come back when you have a brain.";
        }
    }

    static async parseUpdate(text: string): Promise<{ total: number, using: number, notUsing: number, factory: string } | null> {
        if (!this.client) return null;

        const prompt = `Extract factory update data from this message: "${text}".
Return ONLY JSON:
{
  "total": number,
  "using": number,
  "notUsing": number,
  "factory": "string"
}
If numbers are missing, calculate (total = using + notUsing).`;

        try {
            const response = await this.client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: prompt,
            });

            const content = response.output_text || '{}';
            const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Update Parse Error:', error);
            return null;
        }
    }
}
