# Telegram Notifications Setup Guide

Get real-time notifications when your liquidation bot finds opportunities and executes trades!

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the prompts:
   - Choose a name for your bot (e.g., "My Liquidation Bot")
   - Choose a username (must end in 'bot', e.g., "my_liquidation_bot")
4. **Save the bot token** - you'll need this for your `.env` file

Example token format: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`

## Step 2: Get Your Chat ID

### Option A: Using @userinfobot (Easiest)

1. Search for **@userinfobot** on Telegram
2. Send `/start` command
3. The bot will reply with your user ID - this is your **TELEGRAM_CHAT_ID**

### Option B: Using your bot

1. Send a message to your newly created bot (the one from Step 1)
2. Visit this URL in your browser (replace TOKEN with your bot token):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Look for `"chat":{"id":123456789` - that number is your **TELEGRAM_CHAT_ID**

## Step 3: Configure Your .env File

Add these lines to your `.env` file:

```env
# Telegram Bot Token from @BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# Your Telegram Chat ID
TELEGRAM_CHAT_ID=123456789
```

## Step 4: Test It!

Restart your bot:

```bash
npm run dev
```

You should receive a notification when the bot starts!

## Notification Types

Your bot will send notifications for:

🚀 **Bot Started** - When the bot initializes
- Shows wallet address
- Shows minimum profit threshold

🔔 **Opportunity Found** - When a liquidatable position is detected
- Estimated profit
- Vault details
- Timestamp

✅ **Liquidation Successful** - When a liquidation completes
- Actual profit earned
- Transaction link to Solscan
- Vault and signature details

❌ **Liquidation Failed** - If a liquidation attempt fails
- Expected profit
- Error message
- Vault details

🛑 **Bot Stopped** - When you stop the bot (Ctrl+C)
- Total statistics
- Success/failure counts
- Total profit earned

## Troubleshooting

### No notifications received?

1. **Check bot token**: Make sure it's copied correctly with no extra spaces
2. **Check chat ID**: Use @userinfobot to verify your chat ID
3. **Start your bot**: Send `/start` to your bot in Telegram first
4. **Check logs**: Look for "Telegram notifications: ENABLED" in console output

### "Failed to send Telegram notification" error?

- Verify your bot token is valid
- Make sure you've sent `/start` to your bot
- Check your internet connection
- Ensure the chat ID is a number (no quotes needed in .env)

## Optional: Disable Notifications

To disable Telegram notifications, simply:
- Remove or comment out the `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` lines in `.env`
- Or leave them empty

The bot will work fine without Telegram - it just won't send notifications.

## Privacy & Security

- Your bot token is like a password - keep it secure!
- Never share your `.env` file or commit it to git
- Only you and your bot can see the messages
- The bot uses Telegram's secure API

---

Happy liquidating! 🚀
