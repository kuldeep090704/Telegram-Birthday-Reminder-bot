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

​Backend / Compute: Google Apps Script (JavaScript)

​Database & Storage: Google Sheets & Google Drive API

​File Handling: Excel (.xlsx) parsing via Google Workspace converters


⚙️ Setup & Deployment Guide

​Create a Bot: Message @BotFather on Telegram to create a new bot and copy your HTTP API Token.

​Set Up Google Sheet: Create a new Google Sheet, open Extensions > Apps Script, and add the Drive API service.

​Deploy Code: Paste the script into Code.gs, update your BOT_TOKEN, deploy as a Web App (Access: Anyone), and copy your Web App URL.

​Connect Webhook: Run the setWebhook function inside Apps Script.

​Set Daily Trigger: Add a time-driven daily trigger for the sendDailyReminders function between 9:00 AM and 10:00 AM.