// 1. Replace with your actual BotFather Telegram Token
const BOT_TOKEN = "8618299648:AAF2LjgdLYOacXhz6cTrTUSBGjhiAguafZQ";

// 2. Paste your deployed Web App URL here after completing Step 2 below
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzAcG-eDxdXtMgJQV3iQm2tzlk40crjamWTFaMSchsSTbw4-w5VvUp23Ax9VdItUAqk/exec";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SHEET_NAME = "Birthdays";

// ---------------------------------------------------------
// 1. Database Setup (Google Sheets)
// ---------------------------------------------------------
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["ChatID", "Name", "Day", "Month", "Year", "Message"]);
  }
  return sheet;
}

// Run this function ONCE after deploying your Web App to link Telegram
function setWebhook() {
  getOrCreateSheet();
  const url = `${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(WEB_APP_URL)}`;
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

// ---------------------------------------------------------
// 2. Webhook Listener (Handles incoming Telegram updates)
// ---------------------------------------------------------
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    if (!update.message) return;

    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    if (update.message.document) {
      handleExcelUpload(chatId, update.message.document);
    } else if (text.startsWith("/start")) {
      sendMessage(
        chatId,
        "👋 *Welcome to the Birthday Reminder Bot!*\n\n" +
        "Upload an Excel file (`.xlsx`) with your friends' birthdays, and I will " +
        "send you a reminder and a custom message on their special day (24/7 in the cloud!).\n\n" +
        "📋 *Required Excel Columns:*\n" +
        "• `Name` — Friend's name\n" +
        "• `DOB` — Date of birth (e.g., `1998-10-21` or `21/10/1998`)\n" +
        "• `Message` — *(Optional)* Custom note or wish\n\n" +
        "🛠 *Available Commands:*\n" +
        "/template — Download a sample Excel file\n" +
        "/list — View your saved birthdays\n" +
        "/test — Test today's birthday reminders now\n" +
        "/clear — Delete all your saved birthdays"
      );
    } else if (text.startsWith("/template")) {
      sendTemplate(chatId);
    } else if (text.startsWith("/list")) {
      listBirthdays(chatId);
    } else if (text.startsWith("/test")) {
      testTodayReminders(chatId);
    } else if (text.startsWith("/clear")) {
      clearUserBirthdays(chatId);
      sendMessage(chatId, "🗑️ All your saved birthdays have been deleted.");
    }
  } catch (err) {
    console.error("Webhook Error: " + err);
  }
}

// ---------------------------------------------------------
// 3. Command & Excel File Handlers
// ---------------------------------------------------------
function sendTemplate(chatId) {
  // Create a sample spreadsheet in Google Drive temporarily to export as .xlsx
  // const ss = SpreadsheetApp.create("birthday_template_temp");
  // const sheet = ss.getSheets()[0];
  // sheet.appendRow(["Name", "DOB", "Message"]);
  
  // const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  // sheet.appendRow(["Kuldeep chaturvedi", todayStr, "Don't forget to call  and order a cake!"]);
  // sheet.appendRow(["Ms.Ashwini ", "2003-05-14", "Send Priya a birthday gift voucher."]);
  
  // SpreadsheetApp.flush();
  
  // // Download as Excel blob using Drive export links
  // const fileId = ss.getId();
  // const url = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
  // const blob = UrlFetchApp.fetch(url, {
  //   headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }
  // }).getBlob().setName("birthday_template.xlsx");
  
  // // Send document to Telegram
  // UrlFetchApp.fetch(`${TELEGRAM_API}/sendDocument`, {
  //   method: "post",
  //   payload: {
  //     chat_id: chatId,
  //     document: blob,
  //     caption: "📄 Here is a sample Excel template. Edit it with your friends' details and send it back to me!"
  //   },
  //   muteHttpExceptions: true
  // });
  
  // // Delete the temporary file from Google Drive
  // Drive.Files.remove(fileId);
  
  const templateText = 
    "📄 *Excel Template Guide*\n\n" +
    "You can use any standard Excel file (`.xlsx`). Just make sure the first row contains these exact column headings:\n\n" +
    "1️⃣ 'Name' — Your friend's full name\n" +
    "2️⃣ 'DOB' — Date of birth (Format: `YYYY-MM-DD` or `DD/MM/YYYY`)\n" +
    "3️⃣ `Message` — *(Optional)* A customized note or wish for them\n\n" +
    "📋 *Example Layout:*\n" +
    "• Name: `Kuldeep chaturvedi` | DOB: `2003-10-21` | Message: `Call and order cake!`\n" +
    "• Name: `Ms. Ashwini` | DOB: `14/05/2003` | Message: `Send gift voucher!`\n\n" +
    "Once you save your Excel file, just upload it directly here into our chat!";

  sendMessage(chatId, templateText);

}

function handleExcelUpload(chatId, doc) {
  const fileName = (doc.file_name || "").toLowerCase();
  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    sendMessage(chatId, "❌ Please upload a valid Excel file ending in `.xlsx` or `.xls`.");
    return;
  }

  // Send processing notice
  const statusRes = JSON.parse(UrlFetchApp.fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, text: "⏳ Processing your Excel file..." }),
    muteHttpExceptions: true
  }).getContentText());
  const messageId = statusRes.result ? statusRes.result.message_id : null;

  try {
    // 1. Download file blob from Telegram
    const fileRes = JSON.parse(UrlFetchApp.fetch(`${TELEGRAM_API}/getFile?file_id=${doc.file_id}`).getContentText());
    const filePath = fileRes.result.file_path;
    const fileBlob = UrlFetchApp.fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`).getBlob();

    // 2. Convert Excel blob to a temporary Google Sheet via Drive API
    let tempFile;
    if (Drive.Files.create) {
      tempFile = Drive.Files.create({ name: "temp_bday_import", mimeType: MimeType.GOOGLE_SHEETS }, fileBlob);
    } else {
      tempFile = Drive.Files.insert({ title: "temp_bday_import", mimeType: MimeType.GOOGLE_SHEETS }, fileBlob);
    }

    const tempSS = SpreadsheetApp.openById(tempFile.id);
    const rows = tempSS.getSheets()[0].getDataRange().getValues();
    Drive.Files.remove(tempFile.id); // Clean up temp file immediately

    if (rows.length < 2) {
      editMessage(chatId, messageId, "❌ The Excel file appears to be empty.");
      return;
    }

    // 3. Normalize headers
    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const dobIdx = headers.indexOf("dob");
    const msgIdx = headers.indexOf("message");

    if (nameIdx === -1 || dobIdx === -1) {
      editMessage(chatId, messageId, "❌ Missing required columns! Your Excel file must include at least *Name* and *DOB* columns.\nUse /template to download an example.");
      return;
    }

    // 4. Clear previous records for this user and insert new rows
    clearUserBirthdays(chatId);
    const sheet = getOrCreateSheet();
    let addedCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const name = String(rows[i][nameIdx] || "").trim();
      const rawDob = rows[i][dobIdx];
      const customMsg = msgIdx !== -1 ? String(rows[i][msgIdx] || "").trim() : "";

      if (!name || !rawDob) continue;

      const parsedDate = parseDateValue(rawDob);
      if (!parsedDate) continue;

      sheet.appendRow([chatId, name, parsedDate.day, parsedDate.month, parsedDate.year, customMsg]);
      addedCount++;
    }

    editMessage(chatId, messageId, `✅ Successfully saved *${addedCount}* birthdays!\nUse /list to view them or /test to preview today's reminders.`);
  } catch (err) {
    editMessage(chatId, messageId, `⚠️ Failed to read the Excel file: ${err.message}`);
  }
}

function listBirthdays(chatId) {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(chatId)) {
      rows.push({
        name: data[i][1],
        day: String(data[i][2]).padStart(2, "0"),
        month: String(data[i][3]).padStart(2, "0"),
        year: data[i][4]
      });
    }
  }

  if (rows.length === 0) {
    sendMessage(chatId, "📭 You don't have any saved birthdays yet. Use /template to get started!");
    return;
  }

  // Sort by month and day
  rows.sort((a, b) => (a.month + a.day).localeCompare(b.month + b.day));

  const lines = ["🎂 *Your Saved Birthdays:*\n"];
  for (const r of rows) {
    const dateStr = r.year ? `${r.day}/${r.month}/${r.year}` : `${r.day}/${r.month}`;
    lines.push(`• *${r.name}* — \`${dateStr}\``);
  }

  sendMessage(chatId, lines.join("\n"));
}

function clearUserBirthdays(chatId) {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(chatId)) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ---------------------------------------------------------
// 4. Reminder Logic & Daily Trigger
// ---------------------------------------------------------
function formatReminder(name, birthYear, customMsg, curYear) {
  const ageStr = birthYear ? ` (Turning ${curYear - Number(birthYear)}!)` : "";
  const noteStr = customMsg ? `\n💬 *Your Note:* ${customMsg}\n` : "";
  return (
    `🎉 *Birthday Reminder!*\n\n` +
    `Today is *${name}*'s birthday!${ageStr}\n` +
    `${noteStr}\n` +
    `👉 *Ready-to-forward wish:*\n` +
    `\`Happy Birthday ${name}! 🎂✨ Wishing you a wonderful year ahead!\``
  );
}

function testTodayReminders(chatId) {
  const today = new Date();
  const curDay = today.getDate();
  const curMonth = today.getMonth() + 1;
  const curYear = today.getFullYear();

  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(chatId) && Number(data[i][2]) === curDay && Number(data[i][3]) === curMonth) {
      found = true;
      const msg = formatReminder(data[i][1], data[i][4], data[i][5], curYear);
      sendMessage(chatId, msg);
    }
  }

  if (!found) {
    sendMessage(chatId, `📅 None of your saved contacts have a birthday today (\`${Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM")}\`).`);
  }
}

function sendDailyReminders() {
  const today = new Date();
  const curDay = today.getDate();
  const curMonth = today.getMonth() + 1;
  const curYear = today.getFullYear();

  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][2]) === curDay && Number(data[i][3]) === curMonth) {
      const chatId = data[i][0];
      const msg = formatReminder(data[i][1], data[i][4], data[i][5], curYear);
      sendMessage(chatId, msg);
    }
  }
}

// ---------------------------------------------------------
// 5. Utility Helpers
// ---------------------------------------------------------
function parseDateValue(val) {
  if (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val)) {
    return { day: val.getDate(), month: val.getMonth() + 1, year: val.getFullYear() };
  }
  const str = String(val).trim();
  let m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return { day: parseInt(m[1], 10), month: parseInt(m[2], 10), year: parseInt(m[3], 10) };
  
  m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
  return null;
}

function sendMessage(chatId, text) {
  UrlFetchApp.fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
    muteHttpExceptions: true
  });
}

function editMessage(chatId, messageId, text) {
  if (!messageId) {
    sendMessage(chatId, text);
    return;
  }
  UrlFetchApp.fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text, parse_mode: "Markdown" }),
    muteHttpExceptions: true
  });
}