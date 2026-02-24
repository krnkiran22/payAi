import Groq from 'groq-sdk';
import { config } from '../config/envs.js';
export class GroqService {
    static async parseBill(ocrText) {
        try {
            const systemPrompt = "You are a bill parsing engine. Extract structured data from OCR text of Indian bills and receipts.";
            const userPrompt = `Extract the following fields from this bill text and return ONLY a valid JSON object with no explanation:
{
  "amount": "numeric value only",
  "currency": "INR or USD etc",
  "vendor": "merchant/company name",
  "expense_date": "YYYY-MM-DD format",
  "payment_method": "UPI/Cash/Card/Net Banking/unknown",
  "category_hint": "cab/food/stay/shopping/utilities/fuel/travel/other",
  "notes": "brief description of what was purchased"
}

If a field cannot be found, use empty values (0 for amount, empty string for others).
Bill text:
[${ocrText}]`;
            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                model: 'llama-3-70b-8192',
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
        }
        catch (error) {
            console.error('Groq Parsing Error:', error);
            throw new Error('Failed to parse bill data');
        }
    }
}
GroqService.groq = new Groq({
    apiKey: config.GROQ_API_KEY,
});
