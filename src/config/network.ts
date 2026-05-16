import { defineChain, type Chain } from 'viem';
import { cleanEnv, type Env } from './env.js';

export const MONAD_CHAIN_ID = 143;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

/**
 * Build the viem chain purely from env. The transport always uses RPC_URL
 * explicitly, so `rpcUrls` here is informational only.
 */
export function buildChain(env: Env): Chain {
  return defineChain({
    id: env.CHAIN_ID,
    name: env.CHAIN_NAME,
    nativeCurrency: {
      name: env.NATIVE_CURRENCY_SYMBOL,
      symbol: env.NATIVE_CURRENCY_SYMBOL,
      decimals: 18,
    },
    rpcUrls: {
      default: { http: env.RPC_URL ? [env.RPC_URL] : [] },
    },
    ...(env.MULTICALL3_ADDRESS
      ? { contracts: { multicall3: { address: env.MULTICALL3_ADDRESS } } }
      : {}),
  });
}

export function getChain(): Chain {
  return buildChain(cleanEnv());
}

export type AaveAddresses = {
  readonly POOL_ADDRESSES_PROVIDER: `0x${string}`;
  readonly POOL: `0x${string}`;
  readonly AAVE_ORACLE: `0x${string}`;
  readonly DATA_PROVIDER: `0x${string}`;
};

/**
 * Reference Monad addresses. Not used at runtime — the only Aave address the
 * pipeline reads is AAVE_ORACLE_ADDRESS from env (override it per network).
 */
export const aaveAddresses: AaveAddresses = {
  POOL_ADDRESSES_PROVIDER: '0x1f6E754C6F7A49e2d69e5341d65EcB8f8506C69c',
  POOL: '0x4Ba3856a4d851d39C27e2E866daB7A95eF6e0113',
  AAVE_ORACLE: '0x0dFfb00A751a74ac8CF8B022Bf86b1ECd9D7ae6F',
  DATA_PROVIDER: '0xfc87bE7f3657AAD69baDb6247A88E924D1F8bc53',
};
