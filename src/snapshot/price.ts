import { aaveOracleAbi, erc20Abi } from '../chain/abi.js';
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
export async function fetchEndOfWeekBalance(input: EndOfWeekBalanceInput): Promise<bigint> {
  const balance = await input.client.readContract({
    address: input.aTokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [input.userAddress],
    blockNumber: input.blockNumber,
  });
  return balance as bigint;
}

export async function fetchPrices(input: PriceFetchInput): Promise<AssetPrices> {
  if (input.assets.length === 0) {
    return new Map();
  }

  const contracts = input.assets.map((asset) => ({
    address: input.oracleAddress,
    abi: aaveOracleAbi,
    functionName: 'getAssetPrice' as const,
    args: [asset],
    blockNumber: input.blockNumber,
  }));

  const prices = await input.client.multicall({
    contracts,
    blockNumber: input.blockNumber,
  });

  const result = new Map<Address, bigint>();
  for (let i = 0; i < input.assets.length; i++) {
    const asset = input.assets[i];
    if (!asset) {
      continue;
    }
    const price = prices[i];
    if (price && price.status === 'success' && typeof price.result === 'bigint') {
      result.set(asset, price.result);
    }
  }

  return result;
}
