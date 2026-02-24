# PayAI (PotatoBot) 🥔🥊

A powerful Telegram bot designed to manage expenses, monitor factory attendance, and roast the lazy into hitting the **1 Million Hour Goal by March 7**.

---

## 🎯 The Mission
To hit **1 Million Hours of data** by March 7. The bot is programmed to maintain high pressure in group chats through savage roasts and periodic goal reminders.

---

## 🏗️ Architecture & Tech Stack

- **Core**: Node.js & TypeScript
- **Bot Engine**: [Telegraf](https://telegraf.js.org/) (Telegram Bot API)
- **AI / LLM**: [Groq Cloud](https://groq.com/) using the OpenAI SDK (`gpt-oss-20b` model).
- **OCR Engine**: [Tesseract.js](https://tesseract.projectnaptha.com/) for extracting text from transaction screenshots.
- **Database**: [MongoDB](https://www.mongodb.com/) via [Prisma ORM](https://www.prisma.io/).
- **Storage**: [Google Drive API](https://developers.google.com/drive) for secure cloud storage of invoice/bill images.
- **Scheduling**: [node-cron](https://www.npmjs.com/package/node-cron) for 15-minute/60-minute health checks and goal periodic reminders.

---

## 📈 Version History

### **v1.0 - The Bill Collector**
*   **Expense Extraction**: Integrated Tesseract OCR to read text from GPay, UPI, and physical bills.
*   **Groq Integration**: First used LLMs to parse raw OCR text into structured JSON (Amount, Vendor, Date).
*   **Cloud Storage**: Automated uploading of transaction screenshots to specific folders in Google Drive based on user and category.
*   **Database**: Established the core Prisma schema for tracking expenses.

### **v2.0 - The Savage Potato (Current)**
*   **Savage ChatBot**: Added interactive AI "Chat" mode. The bot now replies to mentions and direct replies with edgy, funny, and devastating roasts.
*   **Factory Update Monitoring**: Implemented a notification system where users must report headband usage every 15/60 minutes.
*   **Savage Roasting Service**: Automatically identifies "deadbeats" who miss their update windows and roasts them publicly in the group.
*   **API Key Rotation**: Implemented a failover system for Groq API keys (`GROQ_API_KEYS`). If one key hits a rate limit, the bot instantly rotates to the next key to ensure 100% uptime.
*   **Goal Awareness**: Injected the "March 7 Goal" into the LLM context, making the bot a relentless advocate for hitting the 1M hour target.
*   **Ultra-Resilient Auth**: Built a "super-sanitizer" for Google Service Account JSON to handle the messy environment variable injections common in cloud platforms like Render.

---

## 🛠️ Environment Variables

To run PayAI, you need the following keys in your `.env` or Render environment:

| Key | Description |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather |
| `GROQ_API_KEYS` | Comma-separated list of Groq API keys for rotation |
| `DATABASE_URL` | MongoDB connection string |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The full JSON content of your Google Service Account key |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | The ID of the parent folder in Google Drive |
| `APPROVED_USERS` | Comma-separated list of Telegram usernames allowed to save bills |
| `FACTORY_GROUP_ID` | The Telegram ID of the group where the bot monitors updates |

---

## 🚀 Commands

- `/start` - Wake up the bot.
- `/ping` - Check if the bot is alive.
- `/goal` - View the mission status (1M Hours).
- `/id` - Get the current chat/group ID for configuration.
- `@Potato2210bot [text]` - Talk to the bot (get roasted).

---

## 👷 Development

### **Build**
```bash
npm run build
```

### **Run**
```bash
npm start
```

*Note: The build process automatically generates the Prisma client before compiling TypeScript.*
