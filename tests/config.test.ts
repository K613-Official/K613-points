import { describe, expect, it } from 'vitest';
import { DEFAULT_SUBGRAPH_URL, cleanEnv } from '../src/config/env.js';
import { getWeekWindow, WEEK_DURATION_SECONDS } from '../src/config/season.js';

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
    expect(() => getWeekWindow(0)).toThrow();
    expect(() => getWeekWindow(-1)).toThrow();
    expect(() => getWeekWindow(1.5)).toThrow();
  });

  it('produces consecutive 7-day windows', () => {
    const w1 = getWeekWindow(1);
    const w2 = getWeekWindow(2);
    expect(w2.startTimestamp - w1.startTimestamp).toBe(WEEK_DURATION_SECONDS);
    expect(w1.endTimestamp - w1.startTimestamp).toBe(WEEK_DURATION_SECONDS);
  });
});
