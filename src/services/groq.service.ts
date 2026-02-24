import Groq from 'groq-sdk';
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

    /**
     * Powerful Vision-based parsing. 
     * Uses Llama 3.2 Vision to "see" the image, which handles stylized fonts and complex layouts much better than OCR.
     */
    static async analyzeImage(imagePath: string): Promise<{ data: ExtractedData; raw: string }> {
        try {
            if (!this.groq) {
                throw new Error('Groq API Key is not configured.');
            }

            const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
            const ext = imagePath.split('.').pop()?.toLowerCase();
            const mimeType = (ext === 'png') ? 'image/png' : 'image/jpeg';

            const systemPrompt = "You are an expert Indian bill and payment screenshot parsing engine. You can see images and extract precise data.";
            const userPrompt = `Analyze this image (could be a GPay/UPI screenshot or a bill/invoice). 
Extract the Transaction Amount, Vendor/Merchant Name, Date, and Payment Method.

GUIDELINES:
1. THE AMOUNT: 
   - Look for the primary amount being paid (usually the largest text on GPay).
   - IGNORE balance amounts (e.g., "Balance: 500" or "UPI Lite Balance").
   - Extract only the numeric value.
2. THE VENDOR: The person or entity being paid (e.g., "Rohit Kapoor", "redBus").
3. THE DATE: Usually in DD/MM/YYYY or similar format. If not found, use today's date.
4. CATEGORY: travel/food/shopping/utilities/other.

Return ONLY a valid JSON object:
{
  "amount": 0.00,
  "currency": "INR",
  "vendor": "string",
  "expense_date": "YYYY-MM-DD",
  "payment_method": "UPI/Card/Cash",
  "category_hint": "string",
  "notes": "string"
}

Ensure the output is ONLY JSON.`;

            console.error('--- DEBUG: CALLING GROQ VISION ---');

            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                },
                            },
                        ],
                    },
                ],
                model: 'llama-3.2-11b-vision-preview',
                response_format: { type: 'json_object' },
            });

            const responseContent = completion.choices[0]?.message?.content || '{}';
            console.error('--- DEBUG: GROQ VISION RESPONSE ---');
            console.error(responseContent);

            const parsed = JSON.parse(responseContent);
            let amount = parseFloat(parsed.amount) || 0;

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
            console.error('Groq Vision Error:', error?.message || error);
            throw new Error(`Vision parsing failed: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Text-only fallback (keeps OCR compatibility if needed)
     */
    static async parseBill(ocrText: string): Promise<{ data: ExtractedData; raw: string }> {
        try {
            if (!this.groq) {
                throw new Error('Groq API Key (GROQ_API_KEY) is not set.');
            }

            const systemPrompt = "Extract bill data from OCR text.";
            const userPrompt = `Extract as JSON:
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
                raw: responseContent,
            };
        } catch (error: any) {
            throw new Error(`Text parsing failed: ${error?.message}`);
        }
    }
}
