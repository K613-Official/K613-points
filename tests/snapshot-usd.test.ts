import { describe, expect, it } from 'vitest';
import { toUsd18 } from '../src/snapshot/usd.js';

describe('snapshot/usd toUsd18', () => {
  const ORACLE = 8n;

  it('1 USDC at $1 -> 1e18 (1 USD == 1e18)', () => {
    expect(
      toUsd18({
        minBalance: 1_000_000n,
        price: 100_000_000n,
        tokenDecimals: 6n,
        oracleDecimals: ORACLE,
      }),
    ).toBe(10n ** 18n);
  });

  it('sub-dollar amount is NOT truncated to 0 (old bug)', () => {
    // 0.5 USDC at $1 -> 0.5e18
    expect(
      toUsd18({
        minBalance: 500_000n,
        price: 100_000_000n,
        tokenDecimals: 6n,
        oracleDecimals: ORACLE,
      }),
    ).toBe(5n * 10n ** 17n);
    // Old integer-dollar formula would have produced 0:
    expect((500_000n * 100_000_000n) / 10n ** (6n + ORACLE)).toBe(0n);
  });

  it('18-dec token: 3 tokens at $2 -> 6e18', () => {
    expect(
      toUsd18({
        minBalance: 3n * 10n ** 18n,
        price: 200_000_000n,
        tokenDecimals: 18n,
        oracleDecimals: ORACLE,
      }),
    ).toBe(6n * 10n ** 18n);
  });

  it('zero balance -> 0', () => {
    expect(
      toUsd18({ minBalance: 0n, price: 100_000_000n, tokenDecimals: 8n, oracleDecimals: ORACLE }),
    ).toBe(0n);
  });
});
