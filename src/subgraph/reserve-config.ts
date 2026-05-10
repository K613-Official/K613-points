// PublicClient type imported for future use in fetchReserveConfigHistoryFromRpc
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { PublicClient } from 'viem';

/**
 * Reserve configuration tracking for mid-week freeze detection.
 * Used to filter out reserves that were frozen BEFORE the start of the week (deprecated).
 * Reserves that become frozen MID-WEEK are still counted (user not responsible).
 */

export interface ReserveConfigAtTimestamp {
  timestamp: number;
  isFrozen: boolean;
  isPaused: boolean;
}

/**
 * Query subgraph for reserve configuration history.
 * Use ReserveConfigurationHistoryItem to determine if a reserve was frozen at t0.
 *
 * TODO: Implement via subgraph query.
 * Query ReserveConfigurationHistoryItem(where: { reserve: $reserve, timestamp_lte: $t0 })
 * orderBy: timestamp desc, first: 1
 * Return the latest config before t0 to check isFrozen flag.
 */
export async function getReserveConfigAtTimestamp(
  _reserve: string,
  _timestamp: number,
): Promise<ReserveConfigAtTimestamp> {
  // TODO: implement.
  // This would query the subgraph for ReserveConfigurationHistoryItem
  // to see if the reserve was frozen/paused at a specific timestamp.
  throw new Error('getReserveConfigAtTimestamp: not implemented');
}

/**
 * Filter reserves to exclude those that were frozen at t0 (start of week).
 * Reserves frozen mid-week are included (user not responsible for admin action).
 *
 * Usage in snapshot computation:
 * ```
 * const eligibleReserves = await filterReservesNotFrozenAtT0(
 *   allReserves,
 *   t0Timestamp,
 * );
 * // Now compute min-balance only for eligibleReserves
 * ```
 */
export async function filterReservesNotFrozenAtT0(
  reserves: Array<{ id: string; symbol: string }>,
  t0Timestamp: number,
): Promise<Array<{ id: string; symbol: string }>> {
  const result = [];

  for (const reserve of reserves) {
    const config = await getReserveConfigAtTimestamp(reserve.id, t0Timestamp);
    // Include reserve only if NOT frozen at t0
    if (!config.isFrozen) {
      result.push(reserve);
    }
  }

  return result;
}
