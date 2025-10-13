# Multi-RPC Parallel Scanning Guide

## Overview

The Jupiter Lend Liquidation Bot now supports **multiple RPC endpoints** with **parallel vault scanning** for dramatically improved performance and reliability.

## Key Features

### 1. Multi-RPC Load Balancing
- Support for multiple RPC endpoints simultaneously
- Automatic round-robin distribution for sequential operations
- Parallel distribution for vault scanning
- Per-endpoint rate limiting
- Automatic failover on RPC errors

### 2. Parallel Vault Scanning
- Scans ALL active vaults in parallel across multiple RPCs
- Divides vaults evenly across available endpoints
- Smart filtering (skips vaults with <5% utilization)
- Scan completion time: 5-10 seconds (vs 7 minutes with old approach)

### 3. Rate Limiting
- Per-RPC rate limiter (configurable req/sec)
- Request queuing system
- Smooth rate distribution
- Prevents burst-related 429 errors

### 4. Health Monitoring
- Tracks RPC endpoint health
- Automatic recovery after errors
- Graceful degradation on failures
- Real-time health status reporting

## Performance Comparison

| Configuration | Scan Time | Coverage | Competitiveness |
|--------------|-----------|----------|-----------------|
| **Old (Single RPC, Round-Robin)** | 7 minutes | 3 vaults/30s | Low |
| **New (1 Public RPC)** | ~15 seconds | All vaults/20s | Medium |
| **New (3 Free-Tier RPCs)** | ~5-7 seconds | All vaults/10s | High |
| **New (4+ API Key RPCs)** | ~3-5 seconds | All vaults/7s | Very High |

**Speed increase**: **28-53x faster** liquidation detection!

## Configuration

### Basic Setup (Single RPC)

```env
# Single public RPC endpoint
RPC_ENDPOINTS=https://api.mainnet-beta.solana.com

# Conservative settings for public RPCs
POLL_INTERVAL_MS=20000
MAX_REQUESTS_PER_RPC=4
```

### Advanced Setup (Multiple RPCs)

```env
# Multiple free-tier RPC endpoints
RPC_ENDPOINTS=https://api.mainnet-beta.solana.com,https://rpc.ankr.com/solana,https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Aggressive settings with API keys
POLL_INTERVAL_MS=10000
MAX_REQUESTS_PER_RPC=9
```

### Recommended Free-Tier RPC Providers

1. **Helius** (Recommended)
   - Free tier: 10 requests/second
   - Sign up: https://helius.dev
   - Add to RPC_ENDPOINTS: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

2. **QuickNode**
   - Free tier available
   - Sign up: https://quicknode.com
   - Good global coverage

3. **Ankr**
   - Public endpoint: `https://rpc.ankr.com/solana`
   - Free tier available
   - Multiple regions

4. **Public Solana RPC**
   - Endpoint: `https://api.mainnet-beta.solana.com`
   - No API key required
   - Rate limited

## Performance Tuning

### For Public RPCs (No API Key)
```env
POLL_INTERVAL_MS=20000      # 20 seconds
MAX_REQUESTS_PER_RPC=4      # Conservative
```

### For Free-Tier API Keys (10 req/sec)
```env
POLL_INTERVAL_MS=10000      # 10 seconds
MAX_REQUESTS_PER_RPC=9      # Under 10 req/sec limit
```

### For Paid-Tier API Keys (50+ req/sec)
```env
POLL_INTERVAL_MS=5000       # 5 seconds
MAX_REQUESTS_PER_RPC=25     # Adjust based on plan
```

## Architecture

### Components

1. **RateLimiter** (`src/rate-limiter.ts`)
   - Queue-based request management
   - Configurable requests per second
   - Smooth rate distribution

2. **MultiRPCManager** (`src/rpc-manager.ts`)
   - Connection pool management
   - Load balancing algorithms
   - Health monitoring
   - Automatic failover

3. **LiquidationBot** (`src/liquidator.ts`)
   - Parallel vault scanning
   - Smart vault filtering
   - Opportunity detection
   - Liquidation execution

### Scanning Algorithm

```
1. Fetch all vaults from Jupiter API
2. Filter out inactive vaults (<5% utilization)
3. Divide active vaults across available RPCs
4. Scan each RPC's vault slice in parallel
5. Aggregate all liquidation opportunities
6. Execute profitable liquidations
```

### Rate Limiting Strategy

```
Per RPC:
- Queue incoming requests
- Process at configured rate (e.g., 9 req/sec)
- Reset counter every second
- Delay if rate limit reached
```

## Monitoring

### Health Status

The bot logs RPC health status:

```
[INFO] Initialized 3 RPC endpoints
[INFO]   RPC 1: https://mainnet.helius-rpc.com/?api-key=d8d8052a...
[INFO]   RPC 2: https://api.mainnet-beta.solana.com/
[INFO]   RPC 3: https://rpc.ankr.com/solana
```

### Scan Performance

Each scan reports timing and coverage:

```
[DEBUG] Scanning 41 active vaults (2 skipped) across 3 RPCs...
[INFO] Scan complete in 5.42s - Found 3 opportunities
```

### Error Handling

Errors are logged but don't stop the entire scan:

```
[DEBUG]   Rate limit on vault 16
[WARN] Rate limit on https://api.mainnet-beta.solana.com
[ERROR] Marked https://rpc.example.com as unhealthy (3 errors)
[INFO] Recovered https://rpc.example.com
```

## Troubleshooting

### Getting 429 Rate Limit Errors

**Solution 1**: Increase poll interval
```env
POLL_INTERVAL_MS=30000  # Increase to 30 seconds
```

**Solution 2**: Reduce requests per second
```env
MAX_REQUESTS_PER_RPC=3  # More conservative
```

**Solution 3**: Add more RPC endpoints
```env
RPC_ENDPOINTS=endpoint1,endpoint2,endpoint3
```

### Getting 403 Forbidden Errors

**Cause**: API key doesn't have blockchain access

**Solution**: Get a valid API key from:
- Helius: https://helius.dev
- QuickNode: https://quicknode.com

### Slow Scan Times

**Check**: How many RPCs are configured?
```bash
# Should show multiple endpoints
grep RPC_ENDPOINTS .env
```

**Solution**: Add more free-tier RPC endpoints

### No Liquidations Found

**Normal**: Liquidations are rare events that depend on:
- Market volatility
- Unhealthy positions existing
- Price movements

**Recommendation**: Keep bot running 24/7 for best results

## Cost Analysis

### Free Tier (0 RPCs with API Keys)
- **Cost**: $0/month
- **Scan time**: ~15-20 seconds
- **Competitiveness**: Medium
- **Recommendation**: Good for testing

### Free Tier (3-4 RPC API Keys)
- **Cost**: $0/month
- **Scan time**: ~5-7 seconds
- **Competitiveness**: High
- **Recommendation**: Excellent for production

### Paid Tier (3-4 RPCs @ $50-100/month each)
- **Cost**: $150-400/month
- **Scan time**: ~3-5 seconds
- **Competitiveness**: Very High
- **Recommendation**: For serious liquidation operations

## Best Practices

1. **Start with free tier**: Test with public RPCs first
2. **Add API keys**: Sign up for 3-4 free-tier accounts
3. **Monitor performance**: Watch scan times and success rates
4. **Scale up**: Upgrade to paid tiers if profitable
5. **Diversify providers**: Use multiple RPC providers for redundancy
6. **Keep API keys secure**: Never commit .env to git

## Next Steps

1. Sign up for free RPC API keys:
   - Helius: https://helius.dev
   - QuickNode: https://quicknode.com
   - Ankr: https://www.ankr.com

2. Add them to `.env`:
```env
RPC_ENDPOINTS=https://mainnet.helius-rpc.com/?api-key=KEY1,https://rpc.quicknode.com/KEY2,https://rpc.ankr.com/solana/KEY3
```

3. Adjust performance settings:
```env
POLL_INTERVAL_MS=10000
MAX_REQUESTS_PER_RPC=9
```

4. Run the bot:
```bash
npm start
```

5. Monitor for liquidation opportunities!

## Support

For issues or questions:
- Check logs for error messages
- Review RPC provider documentation
- Adjust rate limiting settings
- Consider adding more RPC endpoints

## Changelog

### v2.0.0 - Multi-RPC Parallel Scanning
- Added support for multiple RPC endpoints
- Implemented parallel vault scanning
- Added per-RPC rate limiting
- Added health monitoring and automatic failover
- Improved scan speed by 28-53x
- Enhanced error handling and logging
- Added backward compatibility for single RPC

### v1.0.0 - Initial Release
- Single RPC endpoint
- Round-robin vault scanning
- Basic rate limiting
