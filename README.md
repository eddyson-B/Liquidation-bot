# Jupiter Lend Liquidation Bot

A fully permissionless liquidation bot for Jupiter Lend protocol on Solana. This bot helps maintain the health of the lending protocol by liquidating undercollateralized positions and earning liquidation penalties.

## Features

- **Automated Liquidation Detection**: Continuously monitors Jupiter Lend vaults for liquidatable positions
- **Multi-RPC Support**: Distributes load across multiple RPC endpoints with parallel scanning
- **Rate Limit Handling**: Intelligent sequential vault scanning with configurable delays
- **Telegram Notifications**: Optional real-time alerts for opportunities, successes, and failures
- **Profit Tracking**: Comprehensive stats tracking for successful liquidations and earned profits
- **Configurable Parameters**: Customize minimum profit thresholds, polling intervals, RPC limits, and more
- **Verbose Logging**: Detailed logging for monitoring and debugging

## How It Works

The liquidation bot follows these steps for each liquidation opportunity:

1. **Scan for Opportunities**: Fetches all active vaults (≥5% utilization) from Jupiter Lend and checks for liquidatable positions
2. **Filter by Profit**: Identifies positions where collateral value exceeds debt value by your minimum threshold
3. **Build Transaction**: Creates optimized liquidation transaction with proper compute units
4. **Execute Liquidation**: Sends transaction to liquidate the position and receive collateral
5. **Profit**: Keeps the difference between collateral value and debt paid (the liquidation penalty)

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- A Solana wallet with some SOL for transaction fees
- A reliable RPC endpoint (recommended: Helius, QuickNode, or Triton)

## Installation

1. Clone the repository or navigate to the project directory:

```bash
cd jupiter-lend-liquidation-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
# Solana RPC endpoints - comma-separated for multiple RPCs (recommended)
# Use reliable RPC providers like Helius, QuickNode, or Triton
RPC_ENDPOINTS=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY,https://api.mainnet-beta.solana.com

# Or use single RPC endpoint (backward compatible)
# RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Your wallet's private key (base58 or array format)
# KEEP THIS SECURE! Never commit this to git
WALLET_PRIVATE_KEY=your_private_key_here

# Minimum profit threshold in USD (optional, defaults to 1)
MIN_PROFIT_USD=1

# Poll interval in milliseconds (defaults to 10000 - 10 seconds)
POLL_INTERVAL_MS=10000

# Maximum concurrent requests per RPC (defaults to 9)
MAX_REQUESTS_PER_RPC=9

# Delay between vault scans in milliseconds (defaults to 300ms)
DELAY_BETWEEN_VAULTS_MS=300

# Enable verbose logging (true/false)
VERBOSE=true

# Telegram Bot Configuration (optional)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

## Getting Your Private Key

### Option 1: From Solana CLI

If you have the Solana CLI installed:

```bash
# Display your private key in base58 format
solana-keygen grind --starts-with $(solana-keygen pubkey ~/.config/solana/id.json | cut -c1-1):1

# Or display as array
cat ~/.config/solana/id.json
```

### Option 2: From Phantom/Solflare

Export your private key from your wallet (keep it secure!) and use the base58 format.

**⚠️ SECURITY WARNING**: Never share your private key or commit it to version control. The `.gitignore` file is configured to exclude `.env` files.

## Building

Build the TypeScript project:

```bash
npm run build
```

## Running the Bot

### Development Mode

Run with ts-node for development:

```bash
npm run dev
```

### Production Mode

Build and run the compiled JavaScript:

```bash
npm run build
npm start
```

### Watch Mode

Auto-rebuild on file changes:

```bash
npm run watch
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RPC_ENDPOINTS` | Comma-separated Solana RPC URLs (recommended) | - | Yes* |
| `RPC_ENDPOINT` | Single Solana RPC endpoint URL (legacy) | - | Yes* |
| `WALLET_PRIVATE_KEY` | Wallet private key (base58 or array format) | - | Yes |
| `MIN_PROFIT_USD` | Minimum profit threshold in USD | 1 | No |
| `POLL_INTERVAL_MS` | Time between scans in milliseconds | 10000 | No |
| `MAX_REQUESTS_PER_RPC` | Max concurrent requests per RPC | 9 | No |
| `DELAY_BETWEEN_VAULTS_MS` | Delay between vault scans (ms) | 300 | No |
| `VERBOSE` | Enable detailed logging | false | No |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications | - | No |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | - | No |

*Either `RPC_ENDPOINTS` or `RPC_ENDPOINT` must be provided

### RPC Recommendations

For production use, we strongly recommend using a premium RPC provider:

- **Helius**: https://www.helius.dev/
- **QuickNode**: https://www.quicknode.com/
- **Triton**: https://triton.one/

Free public RPCs have rate limits that may impact bot performance. Using multiple RPC endpoints with `RPC_ENDPOINTS` distributes the load and increases reliability.

### Telegram Notifications (Optional)

To enable Telegram notifications:

1. **Create a Telegram Bot**:
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/newbot` and follow the prompts
   - Save the bot token provided

2. **Get Your Chat ID**:
   - Message [@userinfobot](https://t.me/userinfobot) on Telegram
   - It will reply with your chat ID
   - Or start a chat with your bot and send `/start`, then check the bot logs

3. **Configure Environment Variables**:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_CHAT_ID=123456789
   ```

4. **Test Notifications**:
   ```bash
   npm run test:telegram
   ```

The bot will send notifications for:
- Bot startup/shutdown
- Liquidation opportunities found
- Successful liquidations
- Failed liquidation attempts

## Monitoring

The bot provides detailed statistics including:

- Total liquidation attempts
- Successful liquidations
- Failed liquidations
- Total profit earned (USD)
- Last liquidation timestamp

Press `Ctrl+C` to stop the bot and view final statistics.

## Example Output

```
[INFO] 2025-10-11T20:00:00.000Z - Liquidation bot initialized
[INFO] 2025-10-11T20:00:00.001Z - Wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
[INFO] 2025-10-11T20:00:00.002Z - Min profit threshold: $1
[INFO] 2025-10-11T20:00:00.003Z - Starting liquidation bot...
[INFO] 2025-10-11T20:00:00.004Z - Press Ctrl+C to stop

[DEBUG] 2025-10-11T20:00:05.000Z - Scanning for liquidation opportunities...
[INFO] 2025-10-11T20:00:06.234Z - Found 2 liquidation opportunities
[INFO] 2025-10-11T20:00:06.235Z - Attempting liquidation with estimated profit: $15.43
[SUCCESS] 2025-10-11T20:00:08.456Z - Liquidation successful! Signature: 5j7s..., Profit: $15.43

=== LIQUIDATION STATS ===
{
  "totalAttempts": 1,
  "successfulLiquidations": 1,
  "failedLiquidations": 0,
  "totalProfitUsd": 15.43,
  "lastLiquidationTime": "2025-10-11T20:00:08.456Z"
}
========================
```

## Architecture

### Project Structure

```
jupiter-lend-liquidation-bot/
├── src/
│   ├── index.ts          # Entry point
│   ├── liquidator.ts     # Main liquidation logic
│   ├── rpc-manager.ts    # Multi-RPC connection manager
│   ├── config.ts         # Configuration management
│   ├── logger.ts         # Logging utility
│   ├── telegram.ts       # Telegram notification service
│   └── types.ts          # TypeScript type definitions
├── dist/                 # Compiled JavaScript output
├── .env                  # Environment variables (not in git)
├── .env.example          # Example environment variables
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Key Components

- **LiquidationBot**: Main class that orchestrates liquidation operations
- **MultiRPCManager**: Manages multiple RPC connections with round-robin distribution
- **TelegramNotifier**: Sends real-time notifications via Telegram
- **Config**: Loads and validates configuration from environment variables
- **Logger**: Provides structured logging with different levels
- **Types**: TypeScript interfaces for type safety

## Troubleshooting

### Common Issues

#### 1. "Failed to fetch liquidation opportunities"

- Check your RPC endpoint is accessible
- Verify your RPC provider has sufficient rate limits
- Try using a premium RPC provider

#### 2. "Transaction failed"

- Ensure your wallet has sufficient SOL for transaction fees
- The position may have already been liquidated by another bot
- Increase slippage tolerance if swap is failing

#### 3. "Failed to parse WALLET_PRIVATE_KEY"

- Verify your private key format (base58 or array)
- Check for extra spaces or newlines in .env file

### Debug Mode

Enable verbose logging to see detailed execution information:

```env
VERBOSE=true
```

## Security Best Practices

1. **Never share your private key**: Keep your `.env` file secure and never commit it
2. **Use a dedicated wallet**: Consider using a separate wallet specifically for the bot
3. **Start with small amounts**: Test with a wallet containing minimal SOL first
4. **Monitor regularly**: Keep an eye on bot performance and profits
5. **Use secure RPC**: Prefer authenticated RPC endpoints over public ones

## Performance Optimization

1. **Multi-RPC Setup**: Use multiple high-quality RPC endpoints with `RPC_ENDPOINTS` for better reliability and throughput
2. **RPC Quality**: Use premium RPC providers (Helius, QuickNode, Triton) with low latency
3. **Rate Limit Tuning**: Adjust `DELAY_BETWEEN_VAULTS_MS` and `MAX_REQUESTS_PER_RPC` to optimize scanning speed while respecting rate limits
4. **Poll Interval**: Adjust `POLL_INTERVAL_MS` based on market conditions (lower for more active markets)
5. **Profit Threshold**: Set `MIN_PROFIT_USD` to avoid unprofitable liquidations and save on transaction fees
6. **Compute Units**: The bot uses optimized compute unit limits (1.4M units) for complex liquidation transactions

## Contributing

This is an open-source project. Contributions welcome:

- Add more sophisticated profit calculations and simulations
- Implement MEV protection strategies
- Add support for custom slippage parameters
- Enhance error handling and retry logic with exponential backoff
- Add Discord/Slack notification integrations
- Implement flash loan integration for capital-efficient liquidations

## Resources

- [Jupiter Lend Documentation](https://dev.jup.ag/docs/lend-api/liquidation)
- [Jupiter Lend SDK](https://www.npmjs.com/package/@jup-ag/lend)
- [Jupiter Swap API](https://station.jup.ag/docs/apis/swap-api)
- [Solana Documentation](https://docs.solana.com/)

## License

MIT License - see LICENSE file for details

## Disclaimer

This software is provided as-is without any guarantees. Liquidation bot operations involve financial risk. Always test thoroughly and understand the risks before running on mainnet with significant capital. The authors are not responsible for any losses incurred through use of this software.

## Support

For issues or questions:

1. Check the [Jupiter Lend Documentation](https://dev.jup.ag/docs/lend-api/liquidation)
2. Join the [Jupiter Discord](https://discord.gg/jup) and ask in the `#dev` or `#jup-lend` channels
3. Reach out to [@jup_lend](https://twitter.com/jup_lend) on Twitter

---

Built with ❤️ for the Jupiter ecosystem
