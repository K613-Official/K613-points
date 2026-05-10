import type { Address, PublicClient } from 'viem';

/**
 * Fetch USD prices for a list of reserves from AaveOracle in a single
 * multicall. Prices are returned in the oracle's quote (typically 8 decimals
 * — same as Aave v3 mainnet). Caller is responsible for divisor/decimals.
 */

export interface PriceFetchInput {
  client: PublicClient;
  oracleAddress: Address;
  /** Underlying asset addresses (NOT a/v token addresses). */
  assets: readonly Address[];
  /** Optional pin to a specific block for deterministic snapshots. */
  blockNumber?: bigint;
}

export interface EndOfWeekBalanceInput {
  client: PublicClient;
  aTokenAddress: Address;
  userAddress: Address;
  blockNumber: bigint;
}

export type AssetPrices = ReadonlyMap<Address, bigint>;

/**
 * Fetch end-of-week balance via RPC call to aToken.balanceOf().
 * This is a fallback/verification against subgraph history-based min-balance,
 * ensuring that aToken transfers (which create history items in subgraph)
 * don't cause discrepancies.
 *
 * NOTE: This gives a POINT-IN-TIME balance at a specific block, not a minimum.
 * Use this only for sanity checks, not for actual min-balance calculation.
 */
export async function fetchEndOfWeekBalance(_input: EndOfWeekBalanceInput): Promise<bigint> {
  // TODO: implement.
  // - Call aToken.balanceOf(user) at blockNumber via client.readContract.
  // - Return balance in wei.
  // Security note: this is post-interest-accrual balance, not scaled balance.
  // If user withdrew some aTokens during the week, this will reflect that,
  // whereas history-based min catches it via transfer events.
  throw new Error('fetchEndOfWeekBalance: not implemented');
}

export async function fetchPrices(_input: PriceFetchInput): Promise<AssetPrices> {
  // TODO: implement.
  // - Build multicall: AaveOracle.getAssetPrice(asset) for each asset.
  // - Use client.multicall({ contracts, blockNumber }).
  // - Return Map<address, price-in-oracle-units>.
  //
  // RESERVE FILTERING NOTES (from security audit):
  // - Only fetch prices for reserves that are NOT frozen at t0 (start of week).
  // - If a reserve becomes frozen mid-week (t0 < freeze < t1), still count it
  //   (user not responsible for admin's freeze action).
  // - Use ReserveConfigurationHistoryItem from subgraph to check "was frozen at t0".
  // - Skip reserves with isFrozen=true at t0 (deprecated assets, no users affected).
  throw new Error('fetchPrices: not implemented');
}
