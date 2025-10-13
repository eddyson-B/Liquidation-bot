import { loadConfig } from './config.js';
import { LiquidationBot } from './liquidator.js';
import { Logger } from './logger.js';
import { TelegramNotifier } from './telegram.js';

async function main() {
  const logger = new Logger(true);

  try {
    logger.info('Loading configuration...');
    const config = loadConfig();

    logger.info('Starting Jupiter Lend Liquidation Bot');
    logger.info('=====================================\n');

    // Initialize Telegram notifier if configured
    const telegram = new TelegramNotifier(
      config.telegramBotToken,
      config.telegramChatId
    );

    const bot = new LiquidationBot(
      config.rpcEndpoints,
      config.walletKeypair,
      config.minProfitUsd,
      config.verbose,
      telegram,
      config.maxRequestsPerRpc
    );

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('\nShutting down gracefully...');
      logger.stats(bot.getStats());

      // Send shutdown notification
      if (telegram.isEnabled()) {
        await telegram.notifyBotStopped(bot.getStats());
      }

      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await bot.start();
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
