import { Telegraf, Context, session, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from '../config/envs';
import { OcrService } from '../services/ocr.service';
import { GroqService, ExtractedData } from '../services/groq.service';
import { DriveService } from '../services/drive.service';
import { DbService } from '../services/db.service';
import { Category, Status } from '@prisma/client';
import { DateTime } from 'luxon';

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

const bot = new Telegraf<MyContext>(config.TELEGRAM_BOT_TOKEN);

// Use local session
bot.use(session({ defaultSession: () => ({}) }));

// Auth Middleware
bot.use(async (ctx, next) => {
    const username = ctx.from?.username || ctx.from?.first_name || 'unknown';
    if (!config.APPROVED_USERS.includes(username)) {
        return ctx.reply(`Sorry @${username}, you are not authorized to use this bot.`);
    }
    return next();
});

bot.start((ctx) => {
    ctx.reply('Welcome to PayAI Bill Collector! 🧾\nSend me a photo of your invoice/receipt to start.');
});

bot.on(message('photo'), async (ctx) => {
    const username = ctx.from?.username || ctx.from?.first_name || 'unknown';
    const photo = ctx.message.photo.pop(); // Get highest resolution
    if (!photo) return;

    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const tempDir = config.TEMP_DIR;
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const localPath = path.join(tempDir, `${Date.now()}_${username}_invoice.jpg`);

    // Download file
    const response = await axios({ url: fileLink.href, responseType: 'stream' });
    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    await ctx.reply('🔍 Processing bill with OCR...');

    try {
        const ocrText = await OcrService.performOcr(localPath);
        if (!ocrText) {
            return ctx.reply('⚠️ Could not extract text from document. Please try a clearer photo.');
        }

        await ctx.reply('🤖 Analyzing data with Groq LLM...');
        const { data, raw } = await GroqService.parseBill(ocrText);

        ctx.session.pendingExpense = {
            ocrText,
            groqData: data,
            groqRaw: raw,
            localPath,
            mimeType: 'image/jpeg',
            username
        };

        const summary = `
📊 *Bill Extracted:*
🏢 Vendor: ${data.vendor}
💰 Amount: ${data.currency} ${data.amount}
📅 Date: ${data.expense_date}
📂 Category: ${data.category_hint}
💳 Payment: ${data.payment_method}
📝 Notes: ${data.notes}

Does this look correct?
    `;

        ctx.replyWithMarkdown(summary, Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm & Save', 'confirm')],
            [Markup.button.callback('❌ Cancel', 'cancel')]
        ]));

    } catch (error) {
        ctx.reply(`❌ Error processing bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

bot.action('confirm', async (ctx) => {
    const pending = ctx.session.pendingExpense;
    if (!pending) return ctx.reply('No pending bill found.');

    await ctx.answerCbQuery('Saving...');
    await ctx.editMessageText('☁️ Uploading to Google Drive and saving to database...');

    try {
        const { groqData, localPath, username, mimeType, ocrText, groqRaw } = pending;
        const category = (groqData.category_hint as Category) || Category.other;

        // 1. Get Counter
        const counter = await DbService.countUserCategoryExpenses(username, category);
        const counterStr = (counter + 1).toString().padStart(2, '0');

        // 2. Generate Filename
        const timestamp = DateTime.now().toFormat('yyyyMMddHHmm');
        const fileName = `${timestamp}_${username}_${category}_${counterStr}.jpg`;

        // 3. Drive Upload
        const folderId = await DriveService.setupDirectoryStructure(username, category);
        const driveFile = await DriveService.uploadFile(localPath, fileName, mimeType, folderId);

        // 4. Save to DB
        await DbService.createExpense({
            username,
            category,
            amount: groqData.amount,
            currency: groqData.currency,
            vendor: groqData.vendor,
            expenseDate: new Date(groqData.expense_date),
            paymentMethod: groqData.payment_method,
            notes: groqData.notes,
            invoiceDriveLink: driveFile.webViewLink,
            invoiceLocalPath: localPath,
            rawOcrText: ocrText,
            groqRawResponse: groqRaw,
            status: Status.processed
        });

        await ctx.editMessageText(`✅ *Success!*\n\nBill saved successfully.\n📁 [View in Drive](${driveFile.webViewLink})`, { parse_mode: 'Markdown' });

        // Clean up
        delete ctx.session.pendingExpense;

    } catch (error) {
        console.error(error);
        await ctx.editMessageText(`❌ Failed to save bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

bot.action('cancel', async (ctx) => {
    delete ctx.session.pendingExpense;
    await ctx.answerCbQuery('Cancelled');
    await ctx.editMessageText('❌ Bill processing cancelled.');
});

export const startBot = () => {
    bot.launch();
    console.log('🚀 bot running...');
};

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
