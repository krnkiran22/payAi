import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { config } from '../config/envs.js';
import { DbService } from './db.service.js';
import { RoastService } from './roast.service.js';
import { DateTime } from 'luxon';

export class SchedulerService {
    private static bot: Telegraf<any>;
    // The people we expect updates from
    private static factoryUsers = ['fredrikparker', 'ram_puddin', 'kiran'];

    static init(bot: Telegraf<any>) {
        this.bot = bot;

        // 15-minute check (9:00 AM to 9:00 PM)
        // Check at :01, :16, :31, :46 to give 1 min grace
        cron.schedule('1,16,31,46 9-21 * * *', () => {
            this.checkUpdates(15);
        }, {
            timezone: "Asia/Kolkata"
        });

        // 60-minute check (10:00 AM to 9:00 PM)
        // Check at :01 each hour
        cron.schedule('1 10-21 * * *', () => {
            this.checkUpdates(60);
        }, {
            timezone: "Asia/Kolkata"
        });

        console.log('⏰ Scheduler initialized (9 AM - 9 PM, 15/60 min cycles)');
    }

    private static async checkUpdates(type: 15 | 60) {
        if (!config.FACTORY_GROUP_ID) return;

        // Calculate the window we are checking
        // For 15 mins, if it's now 10:16, we check the 10:15 window
        const now = DateTime.now().setZone('Asia/Kolkata');
        const windowTime = now.minus({ minutes: 1 }).set({ second: 0, millisecond: 0 }).toJSDate();

        const deadbeats: string[] = [];

        for (const username of this.factoryUsers) {
            const updated = await DbService.hasUserUpdated(username, windowTime);
            if (!updated) {
                deadbeats.push(username);
            }
        }

        if (deadbeats.length > 0) {
            const roast = await RoastService.generateRoast(deadbeats);
            const message = `🚨 *MISSED ${type} MINUTE UPDATE!* 🚨\n\n${roast}`;

            try {
                await this.bot.telegram.sendMessage(config.FACTORY_GROUP_ID, message, { parse_mode: 'Markdown' });
            } catch (err) {
                console.error('Failed to send roast to group:', err);
            }
        }
    }
}
