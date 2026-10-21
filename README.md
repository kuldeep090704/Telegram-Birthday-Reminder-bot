Telegram Birthday Reminder Bot

​A 24/7 serverless Telegram bot that allows users to upload Excel files (.xlsx) containing their friends' names and dates of birth. The bot securely parses the records, isolates each user's data, and automatically sends personalized birthday reminders and custom messages every morning.


​🚀 Key Features

​Excel File Processing: Users can upload custom .xlsx spreadsheets. The bot automatically reads, validates, and parses names, dates of birth, and optional custom notes.

​Multi-User Isolation: Built with privacy in mind. Each user's contact list is tagged and isolated by their unique Telegram ChatID, ensuring complete data separation.

​Automated Daily Scheduler: Powered by time-driven triggers to check databases daily and send proactive birthday alerts without manual intervention.

​Interactive Commands:

​/start — Welcome message and instructions.
​/template — Guide and formatting rules for spreadsheet uploads.

​/list — View all saved birthdays sorted chronologically.

​/test — Manually trigger and preview reminders for today's date.
​/clear — Delete all personal records from the database.

​Zero-Maintenance Cloud Hosting: Runs entirely serverless on Google Apps Script backed by Google Sheets as a database, requiring no paid VPS or local server uptime.


​🛠️ Tech Stack

​Platform: Telegram Bot API (Webhook integration)

​Backend / Compute: Google Apps Script (JavaScript),  python

​Database & Storage: Google Sheets & Google Drive API, sqlite3

​File Handling: Excel (.xlsx) parsing via Google Workspace converters, python


⚙️ Setup & Deployment Guide

​Create a Bot: Message @BotFather on Telegram to create a new bot and copy your HTTP API Token.

​Set Up Google Sheet: Create a new Google Sheet, open Extensions > Apps Script, and add the Drive API service.

​Deploy Code: Paste the script into Code.gs, update your BOT_TOKEN, deploy as a Web App (Access: Anyone), and copy your Web App URL.

​Connect Webhook: Run the setWebhook function inside Apps Script.

​Set Daily Trigger: Add a time-driven daily trigger for the sendDailyReminders function between 9:00 AM and 10:00 AM.

## 🛠️ Choose Your Deployment Method

You can run this bot using either a **Python backend** (ideal for local/VPS servers) or **Google Apps Script** (ideal for 24/7 serverless cloud hosting).

### Option A: Google Apps Script & Google Sheets (Serverless / 24/7 Free)
1. Create a new Google Sheet and open **Extensions > Apps Script**.
2. Add the **Drive API** service from the left sidebar.
3. Paste the code from `Code.gs`, update your `BOT_TOKEN`, and save.
4. Deploy as a **Web app** (Execute as: *Me*, Who has access: *Anyone*) and copy your Web App URL into `WEB_APP_URL`.
5. Run the `setWebhook` function once, and set a daily time-driven trigger for `sendDailyReminders`.

### Option B: Python, SQLite & python-telegram-bot (Local / VPS)
1. Install dependencies:
   ```bash
   pip install "python-telegram-bot[job-queue]" pandas openpyxl