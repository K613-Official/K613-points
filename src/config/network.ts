import { defineChain } from 'viem';

export const MONAD_CHAIN_ID = 143;

export const monad = defineChain({
  id: MONAD_CHAIN_ID,
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [] },
  },
});

export type AaveAddresses = {
  readonly POOL_ADDRESSES_PROVIDER: `0x${string}`;
  readonly POOL: `0x${string}`;
  readonly AAVE_ORACLE: `0x${string}`;
  readonly DATA_PROVIDER: `0x${string}`;
};

export const aaveAddresses: AaveAddresses = {
  POOL_ADDRESSES_PROVIDER: '0x1f6E754C6F7A49e2d69e5341d65EcB8f8506C69c',
  POOL: '0x4Ba3856a4d851d39C27e2E866daB7A95eF6e0113',
  AAVE_ORACLE: '0x0dFfb00A751a74ac8CF8B022Bf86b1ECd9D7ae6F',
  DATA_PROVIDER: '0xfc87bE7f3657AAD69baDb6247A88E924D1F8bc53',
};
