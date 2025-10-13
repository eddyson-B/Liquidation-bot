import TelegramBot from 'node-telegram-bot-api';
import { LiquidationOpportunity, LiquidationResult } from './types.js';

export class TelegramNotifier {
  private bot: TelegramBot | null = null;
  private chatId: string | null = null;
  private enabled: boolean = false;

  constructor(botToken?: string, chatId?: string) {
    if (botToken && chatId) {
      try {
        this.bot = new TelegramBot(botToken, { polling: false });
        this.chatId = chatId;
        this.enabled = true;
        console.log('[INFO] Telegram notifications enabled');
      } catch (error) {
        console.error('[ERROR] Failed to initialize Telegram bot:', error);
        this.enabled = false;
      }
    }
  }

  async notifyOpportunityFound(opportunity: LiquidationOpportunity) {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `
🔔 *Liquidation Opportunity Found!*

💰 *Estimated Profit:* $${opportunity.estimatedProfitUsd.toFixed(2)}

📊 *Details:*
• Vault: \`${opportunity.vault.toString()}\`
• Debt: ${this.formatAmount(opportunity.debtAmount)}
• Collateral: ${this.formatAmount(opportunity.collateralAmount)}

⏰ ${new Date().toLocaleString()}
      `.trim();

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[ERROR] Failed to send Telegram notification:', error);
    }
  }

  async notifyLiquidationSuccess(result: LiquidationResult, opportunity: LiquidationOpportunity) {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `
✅ *Liquidation Successful!*

💵 *Profit Earned:* $${result.profitUsd?.toFixed(2)}

🔗 *Transaction:*
[View on Solscan](https://solscan.io/tx/${result.signature})

📊 *Details:*
• Vault: \`${opportunity.vault.toString()}\`
• Signature: \`${result.signature}\`

⏰ ${new Date().toLocaleString()}
      `.trim();

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[ERROR] Failed to send Telegram notification:', error);
    }
  }

  async notifyLiquidationFailed(result: LiquidationResult, opportunity: LiquidationOpportunity) {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `
❌ *Liquidation Failed*

💰 *Expected Profit:* $${opportunity.estimatedProfitUsd.toFixed(2)}

⚠️ *Error:* ${result.error}

📊 *Details:*
• Vault: \`${opportunity.vault.toString()}\`

⏰ ${new Date().toLocaleString()}
      `.trim();

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[ERROR] Failed to send Telegram notification:', error);
    }
  }

  async notifyBotStarted(walletAddress: string, minProfit: number) {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `
🚀 *Jupiter Lend Liquidation Bot Started*

👛 *Wallet:* \`${walletAddress}\`
💎 *Min Profit:* $${minProfit}

The bot is now monitoring for liquidation opportunities...

⏰ ${new Date().toLocaleString()}
      `.trim();

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[ERROR] Failed to send Telegram notification:', error);
    }
  }

  async notifyBotStopped(stats: any) {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `
🛑 *Jupiter Lend Liquidation Bot Stopped*

📊 *Session Statistics:*
• Total Attempts: ${stats.totalAttempts}
• Successful: ${stats.successfulLiquidations}
• Failed: ${stats.failedLiquidations}
• Total Profit: $${stats.totalProfitUsd.toFixed(2)}

⏰ ${new Date().toLocaleString()}
      `.trim();

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[ERROR] Failed to send Telegram notification:', error);
    }
  }

  private formatAmount(amount: bigint): string {
    const amountStr = amount.toString();
    if (amountStr.length > 6) {
      return `${amountStr.slice(0, -6)}.${amountStr.slice(-6, -4)}M`;
    }
    return amountStr;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
