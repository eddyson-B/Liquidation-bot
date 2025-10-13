import { PublicKey } from '@solana/web3.js';
import { loadConfig } from './config.js';
import { TelegramNotifier } from './telegram.js';
import { LiquidationOpportunity, LiquidationResult } from './types.js';

async function testNotifications() {
  console.log('Testing Telegram Notifications...\n');

  try {
    const config = loadConfig();

    if (!config.telegramBotToken || !config.telegramChatId) {
      console.error('❌ Telegram not configured!');
      console.log('Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your .env file');
      process.exit(1);
    }

    const telegram = new TelegramNotifier(
      config.telegramBotToken,
      config.telegramChatId
    );

    if (!telegram.isEnabled()) {
      console.error('❌ Telegram notifier failed to initialize');
      process.exit(1);
    }

    console.log('✅ Telegram initialized successfully\n');

    // Test 1: Bot Started
    console.log('📤 Sending bot started notification...');
    await telegram.notifyBotStarted(
      config.walletKeypair.publicKey.toString(),
      config.minProfitUsd
    );
    console.log('✅ Bot started notification sent!\n');
    await sleep(2000);

    // Test 2: Opportunity Found
    console.log('📤 Sending opportunity found notification...');
    const mockOpportunity: LiquidationOpportunity = {
      obligationId: new PublicKey('GDfnEsia2WLAW5t8yx2X5j2mkfA74i5kwGdDuZHt7XmG'),
      debtMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
      collateralMint: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
      debtAmount: BigInt(1000000000), // 1000 USDC
      collateralAmount: BigInt(5000000000), // 5 SOL
      estimatedProfitUsd: 25.50,
      vault: new PublicKey('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN')
    };

    await telegram.notifyOpportunityFound(mockOpportunity);
    console.log('✅ Opportunity found notification sent!\n');
    await sleep(2000);

    // Test 3: Successful Liquidation
    console.log('📤 Sending successful liquidation notification...');
    const successResult: LiquidationResult = {
      success: true,
      signature: '5j7s8k9d2h3f4g6h8j9k1l2m3n4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k',
      profitUsd: 25.50
    };

    await telegram.notifyLiquidationSuccess(successResult, mockOpportunity);
    console.log('✅ Successful liquidation notification sent!\n');
    await sleep(2000);

    // Test 4: Failed Liquidation
    console.log('📤 Sending failed liquidation notification...');
    const failResult: LiquidationResult = {
      success: false,
      error: 'Transaction simulation failed: insufficient funds'
    };

    await telegram.notifyLiquidationFailed(failResult, mockOpportunity);
    console.log('✅ Failed liquidation notification sent!\n');
    await sleep(2000);

    // Test 5: Bot Stopped
    console.log('📤 Sending bot stopped notification...');
    const mockStats = {
      totalAttempts: 10,
      successfulLiquidations: 7,
      failedLiquidations: 3,
      totalProfitUsd: 178.50
    };

    await telegram.notifyBotStopped(mockStats);
    console.log('✅ Bot stopped notification sent!\n');

    console.log('\n🎉 All test notifications sent successfully!');
    console.log('Check your Telegram to verify you received all 5 messages.\n');

  } catch (error) {
    console.error('❌ Error testing notifications:', error);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testNotifications();
