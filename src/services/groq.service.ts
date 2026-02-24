import Groq from 'groq-sdk';
import { config } from '../config/envs.js';

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
    private static _groq: Groq | null = null;

    private static get groq() {
        if (!this._groq) {
            if (!config.GROQ_API_KEY) {
                console.warn('⚠️ GROQ_API_KEY is not set. LLM parsing will fail.');
                return null;
            }
            this._groq = new Groq({
                apiKey: config.GROQ_API_KEY,
            });
        }
        return this._groq;
    }

    static async parseBill(ocrText: string): Promise<{ data: ExtractedData; raw: string }> {
        try {
            if (!this.groq) {
                throw new Error('Groq API Key is not configured.');
            }

            const systemPrompt = "You are an expert Indian bill and UPI payment parsing engine. Extract structured data from OCR text of bills, receipts, or GPay/UPI screenshots.";
            const userPrompt = `You are analyzing OCR text from an Indian payment screenshot (like GPay/PhonePe) or a travel invoice (like redBus).
GOAL: Extract the Transaction Amount, Vendor Name, Date, and Payment Method.

GUIDELINES:
1. THE AMOUNT: 
   - On GPay: It's the largest number (e.g., 150, 500, 1200). 
   - IGNORE numbers near keywords like "Balance", "Remaining", "Limit", or "UPI Lite".
   - If you see digits with spaces (e.g., "1 5 0"), combine them.
2. THE VENDOR: Look after "Paid to", "To:", or the merchant name at the top.
3. THE DATE: Usually at the top or bottom in DD/MM/YYYY or MMM DD format.

Return ONLY a JSON object:
{
  "amount": "numeric value",
  "currency": "INR",
  "vendor": "name",
  "expense_date": "YYYY-MM-DD",
  "payment_method": "UPI/Card/Cash",
  "category_hint": "travel/food/shopping/other",
  "notes": "short summary"
}

OCR TEXT:
[${ocrText}]`;

            console.log('--- OCR RAW TEXT START ---');
            console.log(ocrText);
            console.log('--- OCR RAW TEXT END ---');

            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
            });

            const responseContent = completion.choices[0]?.message?.content || '{}';
            console.log('--- GROQ RESPONSE ---');
            console.log(responseContent);

            const parsed = JSON.parse(responseContent);

            // Robust amount cleaning
            let rawAmount = parsed.amount;
            let amount = 0;

            if (rawAmount) {
                // Remove all non-numeric except dot
                let cleaned = String(rawAmount).replace(/[^\d.]/g, '');
                amount = parseFloat(cleaned) || 0;
            }

            // Fallback: If amount is 0, try to find the largest number in OCR that isn't a date or part of a long ID
            if (amount === 0) {
                const numbers = ocrText.match(/\d+[\d,.]*/g) || [];
                const candidates = numbers
                    .map(n => n.replace(/,/g, ''))
                    .map(n => parseFloat(n))
                    .filter(n => !isNaN(n) && n > 0 && n < 1000000); // Exclude likely IDs or timestamps

                if (candidates.length > 0) {
                    // Logic: The transaction amount in GPay is often the largest standalone number
                    // but we should favor the LLM's choice if it found anything.
                    // This is just a safety logger for now.
                    console.log('Fallback amount candidates:', candidates);
                }
            }

            return {
                data: {
                    amount,
                    currency: parsed.currency || 'INR',
                    vendor: parsed.vendor || 'Unknown',
                    expense_date: parsed.expense_date || new Date().toISOString().split('T')[0],
                    payment_method: parsed.payment_method || 'unknown',
                    category_hint: parsed.category_hint || 'other',
                    notes: parsed.notes || '',
                },
                raw: responseContent,
            };
        } catch (error: any) {
            console.error('Groq Parsing Error Details:', error?.response?.data || error?.message || error);
            throw new Error(`Failed to parse bill data: ${error?.message || 'Unknown error'}`);
        }
    }
}
