import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from './logger.js';
import { LiquidationOpportunity, LiquidationResult, LiquidationStats } from './types.js';
import { TelegramNotifier } from './telegram.js';
import { MultiRPCManager } from './rpc-manager.js';

// Jupiter Lend SDK imports
import { Client } from '@jup-ag/lend/api';
import { getLiquidations, getLiquidateIx } from '@jup-ag/lend/borrow';

export class LiquidationBot {
  private rpcManager: MultiRPCManager;
  private wallet: Keypair;
  private minProfitUsd: number;
  private logger: Logger;
  private stats: LiquidationStats;
  private lendClient: Client;
  private telegram: TelegramNotifier | null;
  private delayBetweenVaults: number;

  constructor(
    rpcEndpoints: string[],
    wallet: Keypair,
    minProfitUsd: number,
    verbose: boolean = false,
    telegram: TelegramNotifier | null = null,
    maxRequestsPerRpc: number = 9,
    delayBetweenVaults: number = 300
  ) {
    this.logger = new Logger(verbose);
    this.rpcManager = new MultiRPCManager(rpcEndpoints, this.logger, maxRequestsPerRpc);
    this.wallet = wallet;
    this.minProfitUsd = minProfitUsd;
    this.delayBetweenVaults = delayBetweenVaults;
    this.stats = {
      totalAttempts: 0,
      successfulLiquidations: 0,
      failedLiquidations: 0,
      totalProfitUsd: 0
    };

    // Initialize Jupiter Lend API client
    this.lendClient = new Client();
    this.telegram = telegram;

    this.logger.info('Liquidation bot initialized');
    this.logger.info(`Wallet: ${this.wallet.publicKey.toString()}`);
    this.logger.info(`Min profit threshold: $${this.minProfitUsd}`);
    this.logger.info(`RPC endpoints: ${rpcEndpoints.length}`);
    this.logger.info(`Delay between vaults: ${delayBetweenVaults}ms`);

    if (this.telegram?.isEnabled()) {
      this.logger.info('Telegram notifications: ENABLED');
    }
  }

  async start() {
    this.logger.info('Starting liquidation bot...');
    this.logger.info('Press Ctrl+C to stop\n');

    // Send startup notification
    if (this.telegram?.isEnabled()) {
      await this.telegram.notifyBotStarted(
        this.wallet.publicKey.toString(),
        this.minProfitUsd
      );
    }

    while (true) {
      try {
        await this.runLiquidationCycle();
      } catch (error) {
        this.logger.error('Error in liquidation cycle:', error);
      }

      // Use configurable interval from environment or default to 60s to avoid rate limits
      const interval = parseInt(process.env.POLL_INTERVAL_MS || '60000');
      await this.sleep(interval);
    }
  }

  private async runLiquidationCycle() {
    this.logger.debug('Scanning for liquidation opportunities...');

    const opportunities = await this.fetchLiquidationOpportunities();

    if (opportunities.length === 0) {
      this.logger.debug('No liquidation opportunities found');
      return;
    }

    this.logger.info(`Found ${opportunities.length} liquidation opportunities`);

    for (const opportunity of opportunities) {
      if (opportunity.estimatedProfitUsd < this.minProfitUsd) {
        this.logger.debug(
          `Skipping liquidation with profit $${opportunity.estimatedProfitUsd.toFixed(2)} (below threshold)`
        );
        continue;
      }

      this.logger.info(
        `Attempting liquidation with estimated profit: $${opportunity.estimatedProfitUsd.toFixed(2)}`
      );

      // Notify about opportunity found
      if (this.telegram?.isEnabled()) {
        await this.telegram.notifyOpportunityFound(opportunity);
      }

      const result = await this.executeLiquidation(opportunity);

      if (result.success) {
        this.stats.successfulLiquidations++;
        this.stats.totalProfitUsd += result.profitUsd || 0;
        this.stats.lastLiquidationTime = new Date();
        this.logger.success(
          `Liquidation successful! Signature: ${result.signature}, Profit: $${result.profitUsd?.toFixed(2)}`
        );

        // Notify success
        if (this.telegram?.isEnabled()) {
          await this.telegram.notifyLiquidationSuccess(result, opportunity);
        }
      } else {
        this.stats.failedLiquidations++;
        this.logger.error(`Liquidation failed: ${result.error}`);

        // Notify failure
        if (this.telegram?.isEnabled()) {
          await this.telegram.notifyLiquidationFailed(result, opportunity);
        }
      }

      this.stats.totalAttempts++;
      this.logger.stats(this.stats);
    }
  }

  private async fetchLiquidationOpportunities(): Promise<LiquidationOpportunity[]> {
    try {
      const startTime = Date.now();

      // Fetch vault list
      const vaults = await this.lendClient.borrow.getVaults();

      if (!vaults || vaults.length === 0) {
        return [];
      }

      // Filter out inactive vaults
      const activeVaults = vaults.filter(vault => {
        const borrowAmount = parseFloat(vault.totalBorrow) / Math.pow(10, vault.borrowToken.decimals);
        const supplyAmount = parseFloat(vault.totalSupply) / Math.pow(10, vault.supplyToken.decimals);

        if (borrowAmount === 0 || supplyAmount === 0) {
          return false;
        }

        const utilization = (borrowAmount / supplyAmount) * 100;
        return utilization >= 5; // Skip vaults with <5% utilization
      });

      this.logger.debug(
        `Scanning ${activeVaults.length} active vaults (${vaults.length - activeVaults.length} skipped) sequentially...`
      );

      const opportunities: LiquidationOpportunity[] = [];
      let scannedCount = 0;

      // Sequential scanning with delays to respect rate limits
      for (const vault of activeVaults) {
        try {
          // Rotate through RPCs for load distribution
          const connection = this.rpcManager.getNextConnection();

          // Scan this specific vault for liquidations
          const liquidationData = await getLiquidations({
            vaultId: vault.id,
            connection,
            signer: this.wallet.publicKey,
          });

          scannedCount++;

          if (liquidationData && liquidationData.length > 0) {
            // Process liquidation opportunities
            for (const liquidation of liquidationData) {
              // Convert to human-readable amounts
              const debtAmount = parseFloat(liquidation.amtIn) / Math.pow(10, vault.borrowToken.decimals);
              const collateralAmount = parseFloat(liquidation.amtOut) / Math.pow(10, vault.supplyToken.decimals);

              // Calculate profit in USD
              const debtValueUsd = debtAmount * parseFloat(vault.borrowToken.price);
              const collateralValueUsd = collateralAmount * parseFloat(vault.supplyToken.price);
              const estimatedProfitUsd = collateralValueUsd - debtValueUsd;

              if (estimatedProfitUsd > 0) {
                opportunities.push({
                  obligationId: new PublicKey(vault.address),
                  debtMint: new PublicKey(vault.borrowToken.address),
                  collateralMint: new PublicKey(vault.supplyToken.address),
                  debtAmount: BigInt(liquidation.amtIn),
                  collateralAmount: BigInt(liquidation.amtOut),
                  estimatedProfitUsd,
                  vault: new PublicKey(vault.address)
                });

                this.logger.info(
                  `  ✓ Found liquidation! Vault ${vault.id}: ` +
                  `Pay ${debtAmount.toFixed(4)} ${vault.borrowToken.symbol}, ` +
                  `Get ${collateralAmount.toFixed(4)} ${vault.supplyToken.symbol}, ` +
                  `Profit $${estimatedProfitUsd.toFixed(2)}`
                );
              }
            }
          }

          // Delay between vault scans to respect both Jupiter API and RPC rate limits
          if (scannedCount < activeVaults.length && this.delayBetweenVaults > 0) {
            await this.sleep(this.delayBetweenVaults);
          }

        } catch (error: any) {
          // Log but continue with other vaults
          const isRateLimit = error?.response?.status === 429 ||
                             error?.message?.includes('429') ||
                             error?.message?.includes('Too Many Requests');

          if (isRateLimit) {
            this.logger.debug(`  Rate limit on vault ${vault.id}, waiting longer...`);
            // Wait extra time on rate limit
            await this.sleep(2000);
          } else {
            this.logger.debug(`  Error checking vault ${vault.id}: ${error.message}`);
          }
        }
      }

      const scanTime = ((Date.now() - startTime) / 1000).toFixed(2);

      if (opportunities.length === 0) {
        this.logger.debug(`Scan complete in ${scanTime}s - No liquidations found`);
      } else {
        this.logger.info(`Scan complete in ${scanTime}s - Found ${opportunities.length} opportunities`);
      }

      return opportunities;

    } catch (error: any) {
      this.logger.error('Error fetching liquidation opportunities:', error?.message || error);
      return [];
    }
  }

  private async executeLiquidation(
    opportunity: LiquidationOpportunity
  ): Promise<LiquidationResult> {
    try {
      this.logger.debug('Building liquidation instruction...');

      // Get a connection from the RPC manager
      const connection = this.rpcManager.getNextConnection();

      // Get the vault ID from the opportunity
      // Note: We need to fetch vault details to get the ID
      const vaults = await this.lendClient.borrow.getVaults();
      const vault = vaults.find(v => v.address === opportunity.vault.toString());

      if (!vault) {
        throw new Error('Vault not found');
      }

      // Use Jupiter SDK to build proper liquidation instruction with all required accounts
      const liquidateIxData = await getLiquidateIx({
        vaultId: vault.id,
        debtAmount: new BN(opportunity.debtAmount.toString()),
        signer: this.wallet.publicKey,
        to: this.wallet.publicKey, // Liquidator receives the collateral
        connection,
      });

      const instructions: TransactionInstruction[] = [];

      // 1. Add compute budget for complex liquidation
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })
      );
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
      );

      // 2. Add the liquidation instruction with all required accounts
      instructions.push(...liquidateIxData.ixs);

      // Build and send transaction
      this.logger.debug('Building transaction...');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message(liquidateIxData.addressLookupTableAccounts);

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([this.wallet]);

      this.logger.debug('Sending liquidation transaction...');
      const signature = await connection.sendTransaction(transaction, {
        maxRetries: 3,
        skipPreflight: false
      });

      this.logger.debug(`Transaction sent: ${signature}`);

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      return {
        success: true,
        signature,
        profitUsd: opportunity.estimatedProfitUsd
      };
    } catch (error) {
      this.logger.error('Liquidation execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats(): LiquidationStats {
    return { ...this.stats };
  }
}
