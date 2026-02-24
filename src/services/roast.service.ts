import OpenAI from 'openai';
import { config } from '../config/envs.js';

export class RoastService {
    private static _client: any = null;

    private static get client() {
        if (!this._client) {
            if (!config.GROQ_API_KEY) return null;
            this._client = new OpenAI({
                apiKey: config.GROQ_API_KEY,
                baseURL: 'https://api.groq.com/openai/v1',
            });
        }
        return this._client;
    }

    static async generateRoast(deadbeats: string[]): Promise<string> {
        if (!this.client || deadbeats.length === 0) return '';

        const deadbeatList = deadbeats.map(u => `@${u}`).join(', ');
        const prompt = `You are a savage, funny, and extremely "dirty-minded" (playful but edgy) Telegram bot. 
Your job is to roast these lazy people who missed their 15-minute/60-minute factory update: ${deadbeatList}.

Context: we are tracking people wearing headbands in a factory.
The roast should be:
1. Extremely funny and savage.
2. Use "dirty" humor but keep it within Telegram's funny group chat vibes.
3. Mention their laziness.
4. Call them out by their handles ${deadbeatList}.
5. Be creative and unpredictable.

Make it one short, devastating paragraph.`;

        try {
            const response = await this.client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: prompt,
            });

            return response.output_text || `Yo ${deadbeatList}, where's the update? Stop being lazy!`;
        } catch (error) {
            console.error('Roast Error:', error);
            return `Yo ${deadbeatList}, get moving with the update!`;
        }
    }
}
