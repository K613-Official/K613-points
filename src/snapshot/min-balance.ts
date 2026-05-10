/**
 * Compute the minimum nominal balance over [t0, t1) for a single
 * (user, reserve) pair, using the preItem (latest history item before t0)
 * plus all items inside the window.
 *
 * The minimum-balance rule is the anti-game protection: a user can't
 * deposit just before the snapshot and farm points — only the lowest
 * balance held throughout the week counts.
 *
 * CRITICAL NOTES (verified via Aave subgraph audit):
 * - aToken transfers ARE tracked by Aave subgraph via handleBalanceTransfer
 *   (creates ATokenBalanceHistoryItem for both sender and receiver at transfer block).
 *   Anti-game works correctly: sender's balance drops (min may be 0 or reduced),
 *   receiver's doesn't spike (min stays at pre-transfer level). No RPC fallback needed.
 *   Source: aave/protocol-subgraphs/src/mapping/tokenization/tokenization-v3.ts
 *
 * - Frozen reserves mid-week: if reserve.isFrozen becomes true after t0,
 *   we still count the min normally (user not responsible for admin's freeze).
 *   Only skip if reserve was frozen BEFORE t0 (deprecated asset).
 *   Use ReserveConfigurationHistoryItem to check "was frozen at t0".
 */

export interface BalanceHistoryItem {
  timestamp: number;
  /** Nominal balance at `timestamp` (already de-scaled by liquidity index). */
  balance: bigint;
}

export interface MinBalanceInput {
  /** Latest item with timestamp < t0; undefined if user had zero balance before window. */
  preItem: BalanceHistoryItem | undefined;
  /** Items inside the [t0, t1) window, ordered ascending by timestamp. */
  items: BalanceHistoryItem[];
  /** Window start (inclusive) — unix seconds. */
  t0: number;
  /** Window end (exclusive) — unix seconds. */
  t1: number;
}

export interface MinBalanceResult {
  minBalance: bigint;
  /** Useful for debugging / audit. */
  samples: number;
}

export function computeMinBalances(input: MinBalanceInput): MinBalanceResult {
  // Edge case: user with no history at all (never touched this asset)
  // This is valid — zero balance → zero points for this asset.
  if (!input.preItem && input.items.length === 0) {
    return {
      minBalance: 0n,
      samples: 0,
    };
  }

  const candidates: bigint[] = [];

  // Start with preItem balance (balance at t0, or 0 if no history before t0)
  if (input.preItem) {
    candidates.push(input.preItem.balance);
  } else {
    // No preItem = user had zero balance before t0
    candidates.push(0n);
  }

  // Add all balance samples within [t0, t1)
  for (const item of input.items) {
    if (item.timestamp >= input.t0 && item.timestamp < input.t1) {
      candidates.push(item.balance);
    }
  }

  // Find minimum balance
  const minBalance = candidates.reduce((a, b) => (a < b ? a : b), 0n);

  return {
    minBalance,
    samples: candidates.length,
  };
}
