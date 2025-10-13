import { PublicKey } from '@solana/web3.js';

export interface LiquidationOpportunity {
  obligationId: PublicKey;
  debtMint: PublicKey;
  collateralMint: PublicKey;
  debtAmount: bigint;
  collateralAmount: bigint;
  estimatedProfitUsd: number;
  vault: PublicKey;
}

export interface LiquidationResult {
  success: boolean;
  signature?: string;
  profitUsd?: number;
  error?: string;
}

export interface LiquidationStats {
  totalAttempts: number;
  successfulLiquidations: number;
  failedLiquidations: number;
  totalProfitUsd: number;
  lastLiquidationTime?: Date;
}
