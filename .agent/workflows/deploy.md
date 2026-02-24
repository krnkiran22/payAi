---
description: How to deploy PayAI to Render and setup cloud infrastructure
---

# Deployment & Setup Workflow

## 1. Cloud Database (MongoDB Atlas)
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Go to **Network Access** and "Allow Access from Anywhere" (Render IPs are dynamic).
3. Under **Database Access**, create a user and password.
4. Get your connection string (format: `mongodb+srv://<user>:<password>@cluster.mongodb.net/payai`).

## 2. Render Deployment
1. Connect your Github Repo (`payAi`) to [Render](https://render.com/).
2. Create a **Web Service**.
3. **Runtime**: Node
4. **Build Command**: `npm install && npm run build && npm run prisma:generate`
5. **Start Command**: `npm start`
6. **Environment Variables**: Add all keys from your `.env` (see below for specific instructions on Google JSON).

## 3. Telegram Bot Setup
1. Message [@BotFather](https://t.me/botfather) on Telegram.
2. Send `/newbot` and follow instructions.
3. Copy the **API Token** and add it to Render's `TELEGRAM_BOT_TOKEN`.
4. To find your username for the `APPROVED_USERS` list, message [@userinfobot](https://t.me/userinfobot).

## 4. Google Drive Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project (e.g., "PayAI").
3. Go to **APIs & Services** > **Enabled APIs** > Search & Enable **Google Drive API**.
4. Go to **IAM & Admin** > **Service Accounts**.
5. Create Service Account > Name it "payai-uploader" > Create & Continue.
6. Skip roles, click Done.
7. Click on the new service account > **Keys** tab > **Add Key** > **Create New Key** > **JSON**.
8. **CRITICAL**: The downloaded file is your `GOOGLE_SERVICE_ACCOUNT_JSON`.
9. **Share the Folder**: Create a "Bills" folder in your personal Google Drive, and share it with the `service-account-email@...` (found in the JSON) as "Editor".

## 5. Adding Approved Users
1. Open your Render Environment Variables.
2. Edit `APPROVED_USERS`.
3. Separate usernames with commas: `kiran,john,rahul`.
4. The bot will automatically reload and authorize these users.

## // turbo
6. Run Prisma Check
npx prisma generate
