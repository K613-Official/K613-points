import { describe, expect, it } from 'vitest';
import { DEFAULT_SUBGRAPH_URL, cleanEnv } from '../src/config/env.js';
import { getWeekWindow, WEEK_DURATION_SECONDS } from '../src/config/season.js';
import { buildChain, ARBITRUM_SEPOLIA_CHAIN_ID } from '../src/config/network.js';

describe('config/env', () => {
  it('uses the default subgraph URL when not provided', () => {
    const env = cleanEnv({} as NodeJS.ProcessEnv);
    expect(env.SUBGRAPH_URL).toBe(DEFAULT_SUBGRAPH_URL);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('accepts a fully-populated env', () => {
    const env = cleanEnv({
      SUBGRAPH_URL: 'https://example.com/graph',
      RPC_URL: 'https://rpc.example.com',
      K613S1_ADDRESS: '0x1111111111111111111111111111111111111111',
      DISTRIBUTOR_ADDRESS: '0x2222222222222222222222222222222222222222',
      OPERATOR_PRIVATE_KEY: `0x${'a'.repeat(64)}`,
      LOG_LEVEL: 'debug',
    } as unknown as NodeJS.ProcessEnv);
    expect(env.LOG_LEVEL).toBe('debug');
    expect(env.K613S1_ADDRESS).toMatch(/^0x/);
  });
});

describe('config/season', () => {
  it('rejects non-positive week numbers', () => {
    expect(() => getWeekWindow(0, 1_000_000)).toThrow();
    expect(() => getWeekWindow(-1, 1_000_000)).toThrow();
    expect(() => getWeekWindow(1.5, 1_000_000)).toThrow();
  });

  it('throws when season start is unset or non-positive', () => {
    expect(() => getWeekWindow(1, 0)).toThrow(/SEASON_1_START_TIMESTAMP/);
    expect(() => getWeekWindow(1, -5)).toThrow(/SEASON_1_START_TIMESTAMP/);
  });

  it('produces consecutive 7-day windows from an explicit start', () => {
    const start = 1_700_000_000;
    const w1 = getWeekWindow(1, start);
    const w2 = getWeekWindow(2, start);
    expect(w1.startTimestamp).toBe(start);
    expect(w2.startTimestamp - w1.startTimestamp).toBe(WEEK_DURATION_SECONDS);
    expect(w1.endTimestamp - w1.startTimestamp).toBe(WEEK_DURATION_SECONDS);
  });
});

describe('config/network', () => {
  it('builds the chain from env (Arbitrum Sepolia)', () => {
    const env = cleanEnv({
      CHAIN_ID: '421614',
      CHAIN_NAME: 'Arbitrum Sepolia',
      NATIVE_CURRENCY_SYMBOL: 'ETH',
      RPC_URL: 'https://sepolia-rollup.arbitrum.io/rpc',
    } as unknown as NodeJS.ProcessEnv);
    const chain = buildChain(env);
    expect(chain.id).toBe(ARBITRUM_SEPOLIA_CHAIN_ID);
    expect(chain.id).toBe(421614);
    expect(chain.name).toBe('Arbitrum Sepolia');
    expect(chain.nativeCurrency.symbol).toBe('ETH');
    expect(chain.rpcUrls.default.http[0]).toBe('https://sepolia-rollup.arbitrum.io/rpc');
    expect(chain.contracts?.multicall3?.address).toBe('0xcA11bde05977b3631167028862bE2a173976CA11');
  });

  it('defaults to Monad when env unset', () => {
    const env = cleanEnv({} as NodeJS.ProcessEnv);
    const chain = buildChain(env);
    expect(chain.id).toBe(143);
    expect(chain.name).toBe('Monad');
  });
});
