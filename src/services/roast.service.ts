import Groq from 'groq-sdk';
import { config } from '../config/envs.js';

export class RoastService {
    private static _groq: Groq | null = null;

    private static get groq() {
        if (!this._groq) {
            if (!config.GROQ_API_KEY) return null;
            this._groq = new Groq({ apiKey: config.GROQ_API_KEY });
        }
        return this._groq;
    }

    static async generateRoast(deadbeats: string[]): Promise<string> {
        if (!this.groq || deadbeats.length === 0) return '';

        const deadbeatList = deadbeats.map(u => `@${u}`).join(', ');
        const prompt = `You are a savage, funny, and extremely "dirty-minded" (playful but edgy) Telegram bot. 
Your job is to roast these lazy people who missed their 15-minute/60-minute factory update: ${deadbeatList}.

Context: we are tracking people wearing headbands in a factory.
The roast should be:
1. Extremely funny and savage.
2. Use "dirty" humor but keep it within Telegram's funny group chat vibes (no illegal content, just very edgy insults).
3. Mention their laziness.
4. Call them out by their handles ${deadbeatList}.
5. Be creative and unpredictable.

Make it one short, devastating paragraph.`;

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.9,
            });

            return completion.choices[0]?.message?.content || `Yo ${deadbeatList}, where's the update? Stop being lazy!`;
        } catch (error) {
            console.error('Roast Error:', error);
            return `Yo ${deadbeatList}, get moving with the update!`;
        }
    }
}
