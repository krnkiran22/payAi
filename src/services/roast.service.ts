import OpenAI from 'openai';
import { config } from '../config/envs.js';

export class RoastService {
    private static _clients: any[] = [];
    private static _currentIndex = 0;

    private static get client() {
        if (this._clients.length === 0) {
            if (config.GROQ_API_KEYS.length === 0) return null;
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
        }
    }

    static async generateRoast(deadbeats: string[]): Promise<string> {
        if (config.GROQ_API_KEYS.length === 0 || deadbeats.length === 0) return '';

        const deadbeatList = deadbeats.map(u => `@${u}`).join(', ');
        const prompt = `You are a savage, funny, and extremely "dirty-minded" (playful but edgy) Telegram bot. 
CONTEXT: ${config.GOAL_CONTEXT}
Your job is to roast these lazy people who missed their factory update: ${deadbeatList}.

The roast should be:
1. Extremely funny and savage.
2. Use "dirty" humor but keep it within Telegram's funny group chat vibes.
3. Mention their laziness.
4. Call them out by their handles ${deadbeatList}.
5. Remind them of the March 7 goal (1 Million Hours).

Make it one short, devastating paragraph.`;

        let attempts = 0;
        const maxAttempts = config.GROQ_API_KEYS.length;

        while (attempts < maxAttempts) {
            try {
                const currentClient = this.client;
                if (!currentClient) break;

                const response = await currentClient.responses.create({
                    model: 'openai/gpt-oss-20b',
                    input: prompt,
                });

                return response.output_text || `Yo ${deadbeatList}, where's the update? Stop being lazy!`;
            } catch (error: any) {
                if (error?.status === 429 || error?.message?.includes('rate limit')) {
                    this.rotateKey();
                    attempts++;
                } else {
                    console.error('Roast Error:', error);
                    return `Yo ${deadbeatList}, get moving with the update!`;
                }
            }
        }
        return `Yo ${deadbeatList}, where is the update? We have a goal to hit!`;
    }
}
