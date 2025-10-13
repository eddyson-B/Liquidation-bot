# Jupiter Vaults SDK Documentation

## Overview

The Jupiter Vaults SDK provides a TypeScript interface for interacting with the Jupiter Vaults protocol. This documentation covers the main integration approach: getting instruction objects and account contexts for vault operations including deposit, withdraw, borrow, and payback through a single `operate` function.

## Installation

```bash
npm install @jup-ag/lend
```

## Setup

```typescript
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getOperateIx } from "@jup-ag/lend/borrow";
import { BN } from "bn.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const signer = new PublicKey("YOUR_SIGNER_PUBLIC_KEY");

// Example vault configuration
const vaultId = 1; // Your vault ID
const positionId = 12345; // Your position NFT ID (obtained after minting position NFT)
```

---

## Core Operation Function

### Getting Operate Instruction

Use `getOperateIx()` to get transaction instructions and all necessary account data for vault operations. The function returns multiple instructions that must be executed in order using **v0 (versioned) transactions**:

```typescript
// Get operate instruction with all accounts and data
const {
  ixs,
  addressLookupTableAccounts,
  nftId,
  accounts,
  remainingAccounts,
  remainingAccountsIndices,
} = await getOperateIx({
  colAmount: new BN(1000000000), // Collateral amount (1000 tokens scaled to 1e9)
  debtAmount: new BN(500000000), // Debt amount (500 tokens scaled to 1e9)
  connection,
  positionId: nftId, // Position NFT ID (to create a new position pass it as 0)
  signer: publicKey, // Signer public key
  vaultId: vault_id, // Vault ID
  cluster: "mainnet",
});

// IMPORTANT: Must use v0 (versioned) transaction
const latestBlockhash = await connection.getLatestBlockhash();

// Create transaction message with all instructions in order
const messageV0 = new TransactionMessage({
  payerKey: signer,
  recentBlockhash: latestBlockhash.blockhash,
  instructions: ixs, // All instructions must be added in order
}).compileToV0Message(addressLookupTableAccounts); // Include lookup table accounts

// Create versioned transaction
const versionedTransaction = new VersionedTransaction(messageV0);

// Sign and send versioned transaction
versionedTransaction.sign([signerKeypair]);
const signature = await connection.sendTransaction(versionedTransaction);
console.log("Transaction ID:", signature);
```

### Automatic Position Creation

If `positionId = 0` is provided, the function will automatically batch position creation instructions:

```typescript
// Create new position and perform operation in one transaction
const { ixs, addressLookupTableAccounts, nftId } = await getOperateIx({
  colAmount: new BN(1000000000),
  debtAmount: new BN(0),
  connection,
  positionId: 0, // No position ID = auto-create position
  signer: publicKey,
  vaultId: 1,
  cluster: "mainnet",
});

console.log("New position NFT ID:", nftId); // ID of the created position
console.log("Instructions count:", ixs.length); // Will include position creation + setup + operate

// Must use v0 transaction with lookup tables
const latestBlockhash = await connection.getLatestBlockhash();
const messageV0 = new TransactionMessage({
  payerKey: signer,
  recentBlockhash: latestBlockhash.blockhash,
  instructions: ixs,
}).compileToV0Message(addressLookupTableAccounts);

const versionedTransaction = new VersionedTransaction(messageV0);
versionedTransaction.sign([signerKeypair]);

const signature = await connection.sendTransaction(versionedTransaction);
```

---

## Operation Types

### 1. Deposit Only

```typescript
// Deposit 1000 supply tokens (with automatic position creation if needed)
const { ixs, nftId } = await getOperateIx({
  colAmount: new BN(1000000000), // Positive = deposit
  debtAmount: new BN(0), // No debt change
  connection,
  positionId: 0, // Will create new position automatically
  signer: publicKey,
  vaultId: 1,
  cluster: "mainnet",
});

console.log("Position NFT ID:", nftId); // Will be the new or existing position ID
```

### 2. Withdraw Only

```typescript
// Withdraw 500 supply tokens
const { ixs } = await getOperateIx({
  colAmount: new BN(-500000000), // Negative = withdraw
  debtAmount: new BN(0), // No debt change
  connection,
  positionId: nft.id,
  signer: publicKey,
  vaultId: nft.vault.id,
  cluster: "mainnet",
});
```

### 3. Borrow Only

```typescript
// Borrow 250 borrow tokens
const { ixs } = await getOperateIx({
  colAmount: new BN(0), // No collateral change
  debtAmount: new BN(250000000), // Positive = borrow
  connection,
  positionId: nft.id,
  signer: publicKey,
  vaultId: nft.vault.id,
  cluster: "mainnet",
});
```

### 4. Payback Only

```typescript
// Payback 100 borrow tokens
const { ixs } = await getOperateIx({
  colAmount: new BN(0), // No collateral change
  debtAmount: new BN(-100000000), // Negative = payback
  connection,
  positionId: nft.id,
  signer: publicKey,
  vaultId: nft.vault.id,
  cluster: "mainnet",
});
```

### 5. Deposit + Borrow (Leverage)

```typescript
// Deposit 1000 tokens and borrow 400 tokens
const { ixs } = await getOperateIx({
  colAmount: new BN(1000000000), // Deposit collateral
  debtAmount: new BN(400000000), // Borrow debt
  connection,
  positionId: nft.id,
  signer: publicKey,
  vaultId: nft.vault.id,
  cluster: "mainnet",
});
```

### 6. Payback + Withdraw (Deleverage)

```typescript
// Payback 200 tokens and withdraw 300 tokens
const { ixs } = await getOperateIx({
  colAmount: new BN(-300000000), // Withdraw collateral
  debtAmount: new BN(-200000000), // Payback debt
  connection,
  positionId: nft.id,
  signer: publicKey,
  vaultId: nft.vault.id,
  cluster: "mainnet",
});
```

### 7. Max Withdraw

```typescript
// Withdraw all available collateral
const { ixs } = await getOperateIx({
  colAmount: new BN("-170141183460469231731687303715884105728"), // i128::MIN for max withdraw
  debtAmount: new BN(0),
  connection,
  positionId: nft.id,
  signer: publicKey,
  vaultId: nft.vault.id,
  cluster: "mainnet",
});
```

### 8. Max Payback

```typescript
// Payback all debt
const { ixs } = await getOperateIx({
  colAmount: new BN(0),
  debtAmount: new BN("-170141183460469231731687303715884105728"), // i128::MIN for max payback
  connection,
  positionId: nft.id,
  signer: publicKey,
  vaultId: nft.vault.id,
  cluster: "mainnet",
});
```

---

## Return Object Properties

The `getOperateIx()` function returns an object with the following properties:

```typescript
interface OperateIxResponse {
  ixs: TransactionInstruction[]; // Array of transaction instructions
  addressLookupTableAccounts: AddressLookupTableAccount[]; // Lookup table accounts for optimization
  nftId: number; // Position NFT ID
  accounts: OperateAccounts; // All account addresses used in the operation
  remainingAccounts: PublicKey[]; // Additional accounts (oracle sources, branches, ticks)
  remainingAccountsIndices: number[]; // Indices for remaining accounts categorization
}

interface OperateAccounts {
  signer: PublicKey;
  signerSupplyTokenAccount: PublicKey;
  signerBorrowTokenAccount: PublicKey;
  recipient: PublicKey;
  recipientBorrowTokenAccount: PublicKey;
  recipientSupplyTokenAccount: PublicKey;
  vaultConfig: PublicKey;
  vaultState: PublicKey;
  supplyToken: PublicKey;
  borrowToken: PublicKey;
  oracle: PublicKey;
  position: PublicKey;
  positionTokenAccount: PublicKey;
  currentPositionTick: PublicKey;
  finalPositionTick: PublicKey;
  currentPositionTickId: PublicKey;
  finalPositionTickId: PublicKey;
  newBranch: PublicKey;
  supplyTokenReservesLiquidity: PublicKey;
  borrowTokenReservesLiquidity: PublicKey;
  vaultSupplyPositionOnLiquidity: PublicKey;
  vaultBorrowPositionOnLiquidity: PublicKey;
  supplyRateModel: PublicKey;
  borrowRateModel: PublicKey;
  vaultSupplyTokenAccount: PublicKey;
  vaultBorrowTokenAccount: PublicKey;
  supplyTokenClaimAccount?: PublicKey; // Optional for claim operations
  borrowTokenClaimAccount?: PublicKey; // Optional for claim operations
  liquidity: PublicKey;
  liquidityProgram: PublicKey;
  oracleProgram: PublicKey;
  supplyTokenProgram: PublicKey;
  borrowTokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
  systemProgram: PublicKey;
}
```

---

## CPI Integration Usage

For Anchor programs that need to make CPI calls to Jupiter Vaults, you need to handle the setup instructions separately from the final operate instruction:

```typescript
// In your frontend/client code
const { ixs, accounts, remainingAccounts, remainingAccountsIndices } =
  await getOperateIx({
    colAmount: new BN(1000000000),
    debtAmount: new BN(500000000),
    connection,
    positionId: nft.id,
    signer: userPublicKey,
    vaultId: nft.vault.id,
    cluster: "mainnet",
  });

// IMPORTANT: For CPI integration, you need to:
// 1. Execute setup instructions (all except the last one) in your transaction
// 2. Use the last instruction's accounts for your CPI call

// Setup instructions (all except last) - these prepare the environment
const setupInstructions = ixs.slice(0, -1); // Remove last instruction
const operateInstruction = ixs[ixs.length - 1]; // Last instruction is the actual direct operate call, for CPIs not needed

// Your transaction should include setup instructions first using v0 transaction
const latestBlockhash = await connection.getLatestBlockhash();

const messageV0 = new TransactionMessage({
  payerKey: userPublicKey,
  recentBlockhash: latestBlockhash.blockhash,
  instructions: [...setupInstructions /* your program instruction here */],
}).compileToV0Message(addressLookupTableAccounts);

const versionedTx = new VersionedTransaction(messageV0);

// Then your program instruction that makes CPI call
await program.methods
  .yourVaultOperateMethod(colAmount, debtAmount, remainingAccountsIndices)
  .accounts({
    // Your program accounts
    userAccount: userAccount,

    // Jupiter Vaults accounts (from context) - use accounts from the operate instruction
    signer: accounts.signer,
    signerSupplyTokenAccount: accounts.signerSupplyTokenAccount,
    signerBorrowTokenAccount: accounts.signerBorrowTokenAccount,
    recipient: accounts.recipient,
    recipientBorrowTokenAccount: accounts.recipientBorrowTokenAccount,
    recipientSupplyTokenAccount: accounts.recipientSupplyTokenAccount,
    vaultConfig: accounts.vaultConfig,
    vaultState: accounts.vaultState,
    supplyToken: accounts.supplyToken,
    borrowToken: accounts.borrowToken,
    oracle: accounts.oracle,
    position: accounts.position,
    positionTokenAccount: accounts.positionTokenAccount,
    currentPositionTick: accounts.currentPositionTick,
    finalPositionTick: accounts.finalPositionTick,
    currentPositionTickId: accounts.currentPositionTickId,
    finalPositionTickId: accounts.finalPositionTickId,
    newBranch: accounts.newBranch,
    supplyTokenReservesLiquidity: accounts.supplyTokenReservesLiquidity,
    borrowTokenReservesLiquidity: accounts.borrowTokenReservesLiquidity,
    vaultSupplyPositionOnLiquidity: accounts.vaultSupplyPositionOnLiquidity,
    vaultBorrowPositionOnLiquidity: accounts.vaultBorrowPositionOnLiquidity,
    supplyRateModel: accounts.supplyRateModel,
    borrowRateModel: accounts.borrowRateModel,
    vaultSupplyTokenAccount: accounts.vaultSupplyTokenAccount,
    vaultBorrowTokenAccount: accounts.vaultBorrowTokenAccount,
    liquidity: accounts.liquidity,
    liquidityProgram: accounts.liquidityProgram,
    oracleProgram: accounts.oracleProgram,
    supplyTokenProgram: accounts.supplyTokenProgram,
    borrowTokenProgram: accounts.borrowTokenProgram,
    associatedTokenProgram: accounts.associatedTokenProgram,
    systemProgram: accounts.systemProgram,

    vaultsProgram: new PublicKey(
      "Ho32sUQ4NzuAQgkPkHuNDG3G18rgHmYtXFA8EBmqQrAu"
    ), // Devnet
  })
  .remainingAccounts(remainingAccounts)
  .rpc();
```

### CPI Setup Instructions

The setup instructions handle:

- Account initialization (if needed)
- Token account creation
- Tick and branch setup

**Important**: These setup instructions must be executed before your CPI call, as they prepare the program state for the vault operation.

---

## Account Explanations

### Core Vault Accounts

| Account                       | Purpose                                           |
| ----------------------------- | ------------------------------------------------- |
| `signer`                      | User's wallet public key performing the operation |
| `signerSupplyTokenAccount`    | User's supply token account (source for deposits) |
| `signerBorrowTokenAccount`    | User's borrow token account (source for paybacks) |
| `recipient`                   | Destination wallet for withdrawals/borrows        |
| `recipientSupplyTokenAccount` | Destination for withdrawn supply tokens           |
| `recipientBorrowTokenAccount` | Destination for borrowed tokens                   |

### Vault Configuration

| Account       | Purpose                                       |
| ------------- | --------------------------------------------- |
| `vaultConfig` | Vault configuration PDA containing parameters |
| `vaultState`  | Vault state PDA with current liquidity data   |
| `supplyToken` | Supply token mint address                     |
| `borrowToken` | Borrow token mint address                     |
| `oracle`      | Price oracle account for the vault            |

### Position Management

| Account                 | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `position`              | User's position PDA containing debt/collateral data |
| `positionTokenAccount`  | User's position NFT token account                   |
| `currentPositionTick`   | Current tick where position is located              |
| `finalPositionTick`     | Final tick after operation                          |
| `currentPositionTickId` | Current position ID within tick                     |
| `finalPositionTickId`   | Final position ID within tick                       |
| `newBranch`             | Branch account for tick organization                |

### Liquidity Integration

| Account                          | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `supplyTokenReservesLiquidity`   | Underlying liquidity protocol supply reserves |
| `borrowTokenReservesLiquidity`   | Underlying liquidity protocol borrow reserves |
| `vaultSupplyPositionOnLiquidity` | Vault's supply position in liquidity protocol |
| `vaultBorrowPositionOnLiquidity` | Vault's borrow position in liquidity protocol |
| `supplyRateModel`                | Supply interest rate model                    |
| `borrowRateModel`                | Borrow interest rate model                    |
| `vaultSupplyTokenAccount`        | Vault's supply token holding account          |
| `vaultBorrowTokenAccount`        | Vault's borrow token holding account          |
| `liquidity`                      | Main liquidity protocol PDA                   |
| `liquidityProgram`               | Liquidity protocol program ID                 |

### Remaining Accounts Structure

The `remainingAccountsIndices` array contains three values:

- `[0]` = Number of oracle source accounts
- `[1]` = Number of branch accounts
- `[2]` = Number of tick has debt array accounts

The `remainingAccounts` array is ordered as:

1. Oracle sources (0 to indices[0])
2. Branch accounts (indices[0] to indices[0] + indices[1])
3. Tick has debt arrays (indices[0] + indices[1] to indices[0] + indices[1] + indices[2])

---

## Important Notes

### Amount Scaling

- All amounts are scaled to 1e9 decimals internally by the vault
- Use `new BN('number')` for amounts to handle large numbers
- Positive values = deposit/borrow, Negative values = withdraw/payback
- Use `new BN('-170141183460469231731687303715884105728')` for max withdraw/payback operations

### Position Requirements

- Position NFT can be created automatically by passing `positionId = 0` parameter
- If `positionId` is provided, it will use the existing position
- Position NFT ownership is required for withdraw/borrow operations
- Anyone can deposit to any position or payback debt for any position

### Instructions Batching

- The `ixs` array contains multiple instructions that must be executed in order
- Instructions include: setup, account creation, environment preparation, and the final operate call
- All instructions are required for proper vault operation
- For CPI integration, execute setup instructions first, then make your CPI call with the operate instruction accounts

### Transaction Requirements

- **Must use v0 (versioned) transactions** - Regular transactions are not supported
- Address lookup tables are always provided and must be included in the transaction
- Multiple instructions are returned and must be executed in order
- For CPI integration, execute setup instructions first, then make your CPI call with the operate instruction accounts

### Error Handling

Common errors to handle:

- Invalid position ID or vault ID
- Insufficient collateral for borrow operations
- Position liquidation state conflicts
- Network connectivity issues

---

## Position NFT Creation

Position NFTs are automatically created when `positionId` is not provided:

```typescript
// Create new position and deposit in one transaction
const { ixs, nftId, accounts } = await getOperateIx({
  colAmount: new BN(1000000000),
  debtAmount: new BN(0),
  connection,
  positionId: 0,
  signer: publicKey,
  vaultId: 1,
  cluster: "mainnet",
});

console.log("Created position NFT ID:", nftId);

// Use existing position for subsequent operations
const { ixs: subsequentIxs } = await getOperateIx({
  colAmount: new BN(500000000),
  debtAmount: new BN(200000000),
  connection,
  positionId: nftId, // Use the created position
  signer: publicKey,
  vaultId: 1,
  cluster: "mainnet",
});
```
