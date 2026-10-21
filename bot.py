import os
import sqlite3
import datetime
from io import BytesIO
import pandas as pd
from telegram import Update
from telegram.ext import (
	ApplicationBuilder,
	CommandHandler,
	MessageHandler,
	ContextTypes,
	filters,
)

# Replace with your actual BotFather token or set it as an environment variable
BOT_TOKEN = os.getenv("BOT_TOKEN","YOUR_TELEGRAM_BOT_TOKEN")
DB_NAME = "birthdays.db"

# ---------------------------------------------------------
# 1. Database Setup (Multi-User Support)
# ---------------------------------------------------------
def init_db():
	conn = sqlite3.connect(DB_NAME)
	cursor = conn.cursor()
	cursor.execute("""
		CREATE TABLE IF NOT EXISTS birthdays (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id INTEGER NOT NULL,
			friend_name TEXT NOT NULL,
			birth_month INTEGER NOT NULL,
			birth_day INTEGER NOT NULL,
			birth_year INTEGER,
			custom_message TEXT
		)
	""")
	conn.commit()
	conn.close()

# ---------------------------------------------------------
# 2. Bot Command Handlers
# ---------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
	welcome_text = (
		"👋 Welcome to the Birthday Reminder Bot!\n\n"
		"Upload an Excel file (.xlsx) with your friends' birthdays, and I will remind you on their special day.\n\n"
		"📋 Required Excel Columns:\n"
		"- Name (e.g., Kuldeep chaturvedi)\n"
		"- DOB (e.g., xxxx-xx-xx or xx/xx/xxxx)\n"
		"- Message(Optional custom note)\n\n"
		"Commands:\n"
		"/list - View your saved birthdays\n"
		"/clear - Delete your saved birthdays"
	)
	await update.message.reply_text(welcome_text, parse_mode="Markdown")

async def handle_excel(update: Update, context: ContextTypes.DEFAULT_TYPE):
	document = update.message.document
	chat_id = update.effective_chat.id

	# Verify file extension
	if not document.file_name.endswith((".xlsx", ".xls")):
		await update.message.reply_text("❌ Please upload a valid Excel file (.xlsx or .xls).")
		return

	await update.message.reply_text("⏳ Processing your Excel file...")

	try:
		# Download file into memory
		new_file = await context.bot.get_file(document.file_id)
		file_bytes = await new_file.download_as_bytearray()
		df = pd.read_excel(BytesIO(file_bytes))

		# Normalize column names (strip spaces, lowercase)
		df.columns = [str(col).strip().lower() for col in df.columns]

		if "name" not in df.columns or "dob" not in df.columns:
			await update.message.reply_text(
				"❌ Missing required columns! Make sure your Excel sheet has at least Name and DOB columns.",
				parse_mode="Markdown"
			)
			return

		# Parse dates safely
		df["dob"] = pd.to_datetime(df["dob"], dayfirst=True, errors="coerce")
		df = df.dropna(subset=["name", "dob"])

		if df.empty:
			await update.message.reply_text("❌ No valid rows found. Please check your date formats.")
			return

		conn = sqlite3.connect(DB_NAME)
		cursor = conn.cursor()

		# Optional: Clear previous entries for this user before inserting new ones
		cursor.execute("DELETE FROM birthdays WHERE chat_id = ?", (chat_id,))

		added_count = 0
		for _, row in df.iterrows():
			name = str(row["name"]).strip()
			dob = row["dob"]
			custom_msg = ""
			if "message" in df.columns and pd.notna(row["message"]):
				custom_msg = str(row["message"]).strip()

			cursor.execute("""
				INSERT INTO birthdays (chat_id, friend_name, birth_month, birth_day, birth_year, custom_message)
				VALUES (?, ?, ?, ?, ?, ?)
				""", (chat_id, name, dob.month, dob.day, dob.year, custom_msg))
			added_count += 1
		conn.commit()
		conn.close()

		await update.message.reply_text(
			f"✅ Successfully saved {added_count} birthdays! I will send you a reminder on each friend's birthday.",
			parse_mode="Markdown"
		)

	except Exception as e:
		await update.message.reply_text(f"⚠️ Failed to read the Excel file. Error: {str(e)}")

async def list_birthdays(update: Update, context: ContextTypes.DEFAULT_TYPE):
	chat_id = update.effective_chat.id
	conn = sqlite3.connect(DB_NAME)
	cursor = conn.cursor()
	cursor.execute("""
		SELECT friend_name, birth_day, birth_month, birth_year
		FROM birthdays
		WHERE chat_id = ?
		ORDER BY birth_month, birth_day
		""", (chat_id,))
	rows = cursor.fetchall()
	conn.close()

	if not rows:
		await update.message.reply_text("📭 You don't have any saved birthdays yet. Send me an .xlsx file to get started!")
		return

	lines = ["🎂 Your Saved Birthdays:\n"]
	for name, day, month, year in rows:
		date_str = f"{day:02d}/{month:02d}/{year}" if year else f"{day:02d}/{month:02d}"
		lines.append(f"• {name} — {date_str}")

	await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def clear_birthdays(update: Update, context: ContextTypes.DEFAULT_TYPE):
	chat_id = update.effective_chat.id
	conn = sqlite3.connect(DB_NAME)
	cursor = conn.cursor()
	cursor.execute("DELETE FROM birthdays WHERE chat_id = ?", (chat_id,))
	conn.commit()
	conn.close()
	await update.message.reply_text("🗑️ All your saved birthdays have been deleted.")

# ---------------------------------------------------------
# 3. Daily Birthday Check Scheduler
# ---------------------------------------------------------

async def send_daily_reminders(context: ContextTypes.DEFAULT_TYPE):
	today = datetime.date.today()
	conn = sqlite3.connect(DB_NAME)
	cursor = conn.cursor()
	cursor.execute("""
		SELECT chat_id, friend_name, birth_year, custom_message
		FROM birthdays
		WHERE birth_month = ? AND birth_day = ?
		""", (today.month, today.day))
	matches = cursor.fetchall()
	conn.close()

	for chat_id, name, birth_year, custom_msg in matches:
		age_str = f" (Turning {today.year - birth_year}!)" if birth_year else ""

		# Build the personalized reminder
		if custom_msg:
			reminder_text = (
				f"🎉 Birthday Reminder!\n\n"
				f"Today is {name}'s birthday!{age_str}\n\n"
				f"💬 Your custom note: {custom_msg}\n\n"
				f"👉 Ready-to-forward wish:\n"
				f"\"Happy Birthday {name}! 🎂✨ Wishing you an amazing year ahead!\""
			)
		else:
			reminder_text = (
				f"🎉 Birthday Reminder!\n\n"
				f"Today is {name}'s birthday!{age_str}\n\n"
				f"👉 Ready-to-forward wish:\n"
				f"\"Happy Birthday {name}! 🎂✨ Wishing you an amazing year ahead!\""
			)

		try:
			await context.bot.send_message(chat_id=chat_id, text=reminder_text, parse_mode="Markdown")
		except Exception as e:
			print(f"Failed to send message to {chat_id}: {e}")
#----------------------------------------------------------------
# x. test function execution
#---------------------------------------------------------------

async def test_today_remainders(update, context:ContextTypes.DEFAULT_TYPE):
	chat_id = update.effective_chat.id
	today = datetime.date.today()
	conn = sqlite3.connect(DB_NAME)
	cursor = conn.cursor()
	cursor.execute("""
	 	SELECT friend_name, birth_year, custom_message
	 	from birthdays
	 	where chat_id = ? and birth_month = ? and birth_day = ?
	 """,(chat_id, today.month, today.day))
	matches = cursor.fetchall()
	conn.close()

	if not matches:
	 	await update.message.reply_text("None of your saved contacts have a birthdays today.")
	 	return
	for name, birth_year, custom_msg in matches:
	 	age_str = f"(Turning {today.year - birth_year}!)" if birth_year else""
	 	note_str = f"\n *Your custom note :* {custom_msg}\n" if custom_msg else ""
	 	reminder_text = (
	 		f"**Birthday Remainder!**\n\n"
	 		f"Today is **{name}**'s Birthday!{age_str}\n"
	 		f"{note_str}\n"
	 		f"*Ready -to forward wish : *\n"
	 		f"\"Happy birthday to {name}! Wishing you many many return of the day !!\""

	 	)
	 	await update.message.reply_text(reminder_text, parse_mode = "Markdown")

# ---------------------------------------------------------
# 4. Main Execution
# ---------------------------------------------------------

def main():
	init_db()
	app = ApplicationBuilder().token(BOT_TOKEN).build()

	# Register command and file handlers
	app.add_handler(CommandHandler("start", start))
	app.add_handler(CommandHandler("list", list_birthdays))
	app.add_handler(CommandHandler("clear", clear_birthdays))
	app.add_handler(CommandHandler("test", test_today_remainders))
	app.add_handler(MessageHandler(filters.Document.ALL, handle_excel))

	# Schedule daily birthday check at 09:00 AM IST (UTC+5:30)
	ist_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
	target_time = datetime.time(hour=9, minute=0, tzinfo=ist_tz)
	app.job_queue.run_daily(send_daily_reminders, time=target_time)

	print("Bot is running...")
	app.run_polling()

if __name__ == "__main__":
	main()