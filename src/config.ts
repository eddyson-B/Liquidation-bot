import dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

dotenv.config();

export interface Config {
  rpcEndpoints: string[];
  walletKeypair: Keypair;
  minProfitUsd: number;
  pollIntervalMs: number;
  verbose: boolean;
  maxRequestsPerRpc: number;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export function loadConfig(): Config {
  const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

  if (!walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY environment variable is required');
  }

  // Support both single RPC_ENDPOINT and multiple RPC_ENDPOINTS
  let rpcEndpoints: string[] = [];

  if (process.env.RPC_ENDPOINTS) {
    // Multiple endpoints (comma-separated)
    rpcEndpoints = process.env.RPC_ENDPOINTS
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);
  } else if (process.env.RPC_ENDPOINT) {
    // Single endpoint (backward compatibility)
    rpcEndpoints = [process.env.RPC_ENDPOINT];
  }

  if (rpcEndpoints.length === 0) {
    throw new Error('Either RPC_ENDPOINT or RPC_ENDPOINTS environment variable is required');
  }

  let walletKeypair: Keypair;
  try {
    // Support both base58 and array format
    const privateKeyBytes = walletPrivateKey.includes('[')
      ? Uint8Array.from(JSON.parse(walletPrivateKey))
      : bs58.decode(walletPrivateKey);

    walletKeypair = Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Failed to parse WALLET_PRIVATE_KEY: ${error}`);
  }

  return {
    rpcEndpoints,
    walletKeypair,
    minProfitUsd: parseFloat(process.env.MIN_PROFIT_USD || '1'),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '10000'),
    verbose: process.env.VERBOSE === 'true',
    maxRequestsPerRpc: parseInt(process.env.MAX_REQUESTS_PER_RPC || '9'),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID
  };
}
