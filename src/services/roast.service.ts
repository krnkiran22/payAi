import { config } from '../config/envs.js';
import { GroqService } from './groq.service.js';

export class RoastService {
    static async generateRoast(deadbeats: string[]): Promise<string> {
        if (config.GROQ_API_KEYS.length === 0 || deadbeats.length === 0) return '';

        const deadbeatList = deadbeats.map(u => `@${u}`).join(', ');

        // System goal reminder has a different tone
        const isGoalReminder = deadbeats.includes('system_goal_reminder');

        const prompt = isGoalReminder
            ? `You are PotatoBot. CONTEXT: ${config.GOAL_CONTEXT}. 
               Give a savage and high-pressure update on why we need to hit the 1 Million Hours goal by March 7. 
               Be devastatingly funny and make them feel the urgency.`
            : `You are a savage, funny, and extremely "dirty-minded" (playful but edgy) Telegram bot. 
               CONTEXT: ${config.GOAL_CONTEXT}
               Your job is to roast these lazy people who missed their factory update: ${deadbeatList}.
               The roast should be:
               1. Extremely funny and savage.
               2. Use "dirty" humor but keep it within group chat vibes.
               3. Mention their laziness.
               4. Call them out by their handles ${deadbeatList}.
               5. Remind them of the March 7 goal (1 Million Hours).
               Make it one short, devastating paragraph.`;

        try {
            const response = await GroqService.runWithRetry((client) => client.responses.create({
                model: 'openai/gpt-oss-20b',
                input: prompt,
            }));

            return response.output_text || `Yo ${deadbeatList}, where's the update? Stop being lazy!`;
        } catch (error) {
            console.error('Roast Error:', error);
            return `Yo ${deadbeatList}, get moving with the update! We have a goal to hit!`;
        }
    }
}
