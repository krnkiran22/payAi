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
            const userPrompt = `Extract the following fields from this OCR text. 
CRITICAL: For invoices, look for "Total Invoice Value", "Grand Total", or "Net Amount". 
For GPay/UPI, look for the largest bold number or digits near "₹" or "Paid to".

🚫 IMPORTANT: Ignore any amounts labeled as "Balance", "Remaining Balance", "UPI Lite Balance", or "Available Credit". ONLY extract the actual amount being paid or transferred.

Return ONLY a valid JSON object:
{
  "amount": "numeric value only",
  "currency": "INR",
  "vendor": "merchant/company name (e.g., redBus, Jai Sai Baba Travels, Rohit Kapoor)",
  "expense_date": "YYYY-MM-DD format",
  "payment_method": "UPI/Cash/Card/Net Banking/unknown",
  "category_hint": "cab/food/stay/shopping/utilities/fuel/travel/other",
  "notes": "brief description"
}

If a field is missing, use 0 for amount or empty string.
OCR Text:
[${ocrText}]`;

            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
            });

            const responseContent = completion.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(responseContent);

            // Clean amount: Remove currency symbols, commas, and handle potential spaces
            let amountStr = String(parsed.amount || '0').replace(/[^\d.]/g, '');
            let amount = parseFloat(amountStr) || 0;

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
