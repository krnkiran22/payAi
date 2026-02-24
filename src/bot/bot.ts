import { Telegraf, Context, session, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from '../config/envs.js';
import { OcrService } from '../services/ocr.service.js';
import { GroqService, ExtractedData } from '../services/groq.service.js';
import { DriveService } from '../services/drive.service.js';
import { DbService } from '../services/db.service.js';
import { Category, Status } from '@prisma/client';
import { DateTime } from 'luxon';
import { SchedulerService } from '../services/scheduler.service.js';

interface MyContext extends Context {
    session: {
        pendingExpense?: {
            ocrText: string;
            groqData: ExtractedData;
            groqRaw: string;
            localPath: string;
            mimeType: string;
            username: string;
        };
    };
}

let _bot: Telegraf<MyContext> | null = null;

const getBot = () => {
    if (!_bot) {
        if (!config.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
        }
        _bot = new Telegraf<MyContext>(config.TELEGRAM_BOT_TOKEN);
        setupBot(_bot);

        // Initialize Scheduler
        SchedulerService.init(_bot);
    }
    return _bot;
};

function setupBot(bot: Telegraf<MyContext>) {
    bot.use(session({ defaultSession: () => ({}) }));

    // Auth Middleware
    bot.use(async (ctx, next) => {
        const username = (ctx.from?.username || ctx.from?.first_name || 'unknown').toLowerCase();
        const isApproved = config.APPROVED_USERS.some(u => u.toLowerCase() === username);

        if (!isApproved) {
            return ctx.reply(`Sorry @${ctx.from?.username || ctx.from?.first_name}, you are not authorized.`);
        }
        return next();
    });

    bot.start((ctx) => {
        ctx.reply('Welcome to PotatoBot! 🥔\nSend me a bill or update the factory status.');
    });

    bot.on(message('photo'), async (ctx) => {
        const username = ctx.from?.username || ctx.from?.first_name || 'unknown';
        const photo = ctx.message.photo.pop();
        if (!photo) return;

        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        const tempDir = config.TEMP_DIR;
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const localPath = path.join(tempDir, `${Date.now()}_${username}_invoice.jpg`);
        const response = await axios({ url: fileLink.href, responseType: 'stream' });
        const writer = fs.createWriteStream(localPath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
        });

        await ctx.reply('🔍 Processing bill with OCR...');

        try {
            const ocrText = await OcrService.performOcr(localPath);
            if (!ocrText) return ctx.reply('⚠️ No text found.');

            await ctx.reply('🤖 Analyzing data with AI (GPT-OSS-20B)...');
            const { data, raw } = await GroqService.parseBill(ocrText);

            ctx.session.pendingExpense = {
                ocrText, groqData: data, groqRaw: raw, localPath, mimeType: 'image/jpeg', username
            };

            const summary = `
📊 *Bill Extracted:*
🏢 Vendor: ${data.vendor}
💰 Amount: ${data.currency} ${data.amount}
📅 Date: ${data.expense_date}

Does this look correct?`;

            ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
                [Markup.button.callback('✅ Confirm', 'confirm')],
                [Markup.button.callback('❌ Cancel', 'cancel')]
            ]));

        } catch (error) {
            ctx.reply(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    bot.on(message('text'), async (ctx, next) => {
        const chatId = ctx.chat.id.toString();
        const chatType = ctx.chat.type;
        const text = ctx.message.text;
        const username = ctx.from?.username || ctx.from?.first_name || 'unknown';

        if (chatType === 'group' || chatType === 'supergroup') {
            console.log(`💬 Group [${ctx.chat.title}] ID: ${chatId}`);
        }

        // --- Reply/Mention Logic (Savage Mode) ---
        const isMentioned = text.includes(`@${ctx.botInfo.username}`) || (ctx.message as any).reply_to_message?.from?.id === ctx.botInfo.id;
        if (isMentioned || text.toLowerCase() === 'hi' || text.toLowerCase().startsWith('hi ')) {
            try {
                const reply = await GroqService.chat(text);
                return await ctx.reply(reply);
            } catch (err) {
                console.error(err);
            }
        }

        // Only process updates if it's the right group
        if (chatId !== config.FACTORY_GROUP_ID) return next();

        // --- Factory Update Logic ---
        if (text.toLowerCase().includes('update') || /\d+/.test(text)) {
            const data = await GroqService.parseUpdate(text);
            if (data && (data.total > 0 || data.using > 0)) {
                const now = DateTime.now().setZone('Asia/Kolkata');
                let minutes = now.minute;
                let nextWindow = now.set({ second: 0, millisecond: 0 });

                if (minutes <= 0) nextWindow = nextWindow.set({ minute: 0 });
                else if (minutes <= 15) nextWindow = nextWindow.set({ minute: 15 });
                else if (minutes <= 30) nextWindow = nextWindow.set({ minute: 30 });
                else if (minutes <= 45) nextWindow = nextWindow.set({ minute: 45 });
                else nextWindow = nextWindow.plus({ hours: 1 }).set({ minute: 0 });

                await DbService.createFactoryUpdate({
                    username,
                    totalPeople: data.total,
                    usingHeadband: data.using,
                    notUsingHeadband: data.notUsing,
                    factoryName: data.factory,
                    updateWindow: nextWindow.toJSDate()
                });

                await ctx.reply(`✅ Update saved for @${username} (${nextWindow.toFormat('HH:mm')})`);
            }
        }
    });

    bot.action('confirm', async (ctx) => {
        const pending = ctx.session.pendingExpense;
        if (!pending) return;
        await ctx.answerCbQuery('Saving...');
        try {
            const { groqData, localPath, username, mimeType, ocrText, groqRaw } = pending;
            const category = (groqData.category_hint as Category) || Category.other;
            const counter = await DbService.countUserCategoryExpenses(username, category);
            const fileName = `${DateTime.now().toFormat('yyyyMMddHHmm')}_${username}.jpg`;
            const folderId = await DriveService.setupDirectoryStructure(username, category);
            const driveFile = await DriveService.uploadFile(localPath, fileName, mimeType, folderId);

            await DbService.createExpense({
                username, category, amount: groqData.amount, currency: groqData.currency,
                vendor: groqData.vendor, expenseDate: new Date(groqData.expense_date),
                paymentMethod: groqData.payment_method, notes: groqData.notes,
                invoiceDriveLink: driveFile.webViewLink || undefined,
                invoiceLocalPath: localPath, rawOcrText: ocrText,
                groqRawResponse: groqRaw, status: Status.processed
            });

            await ctx.editMessageText(`✅ Bill saved to Drive!`);
            delete ctx.session.pendingExpense;
        } catch (error) {
            await ctx.editMessageText(`❌ Save failed: ${error instanceof Error ? error.message : 'error'}`);
        }
    });

    bot.action('cancel', async (ctx) => {
        delete ctx.session.pendingExpense;
        await ctx.answerCbQuery('Cancelled');
        await ctx.editMessageText('❌ Cancelled.');
    });
}

export const startBot = () => {
    try {
        const bot = getBot();
        bot.launch();
        console.log('🚀 bot running...');
    } catch (err) {
        console.error('❌ Failed to start bot:', err);
    }
};

process.once('SIGINT', () => _bot?.stop('SIGINT'));
process.once('SIGTERM', () => _bot?.stop('SIGTERM'));
