import { describe, expect, it } from 'vitest';
import { computePoints } from '../src/snapshot/points.js';

describe('snapshot/points', () => {
  it('computes supply * 1 + borrow * 2', () => {
    const out = computePoints({
      user: '0x1111111111111111111111111111111111111111',
      reserve: '0x2222222222222222222222222222222222222222',
      reserveSymbol: 'WMON',
      supplyUsd: 100n,
      borrowUsd: 50n,
    });
    expect(out.supplyPoints).toBe(100n);
    expect(out.borrowPoints).toBe(100n);
    expect(out.totalPoints).toBe(200n);
  });

  it.todo('handles zero values without producing negative or NaN points');
});
