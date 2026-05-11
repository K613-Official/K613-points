import { getSubgraphClient } from './client.js';
import { RESERVE_CONFIG_AT_TIMESTAMP_QUERY } from './queries.js';

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

export async function getReserveConfigAtTimestamp(
  reserve: string,
  timestamp: number,
): Promise<ReserveConfigAtTimestamp> {
  const client = getSubgraphClient();

  const response = await client.request<{
    configItems: Array<{
      id: string;
      timestamp: number;
      isFrozen: boolean;
      isActive: boolean;
    }>;
  }>(RESERVE_CONFIG_AT_TIMESTAMP_QUERY, {
    reserve: reserve.toLowerCase(),
    timestamp,
  });

  const item = response.configItems[0];
  if (!item) {
    return {
      timestamp: 0,
      isFrozen: false,
      isPaused: false,
    };
  }

  return {
    timestamp: item.timestamp,
    isFrozen: item.isFrozen,
    isPaused: !item.isActive,
  };
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
