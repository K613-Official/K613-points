import { describe, expect, it } from 'vitest';
import { computeMinBalances } from '../src/snapshot/min-balance.js';

const t0 = 1000;
const t1 = 2000;

describe('snapshot/min-balance', () => {
  it('returns 0 when preItem is undefined and items is empty', () => {
    const r = computeMinBalances({ preItem: undefined, items: [], t0, t1 });
    expect(r.minBalance).toBe(0n);
    expect(r.samples).toBe(0);
  });

  it('uses preItem balance when no items fall in the window', () => {
    // preItem before t0, plus an item that is out of window (ts < t0).
    const r = computeMinBalances({
      preItem: { timestamp: 900, balance: 50n },
      items: [{ timestamp: 5, balance: 999n }],
      t0,
      t1,
    });
    expect(r.minBalance).toBe(50n);
  });

  it('regression: preItem with no in-window items must NOT collapse to 0', () => {
    // This is the exact bug: reduce seeded with 0n forced every min to 0.
    const r = computeMinBalances({
      preItem: { timestamp: 900, balance: 28992946232630000n },
      items: [],
      t0,
      t1,
    });
    expect(r.minBalance).toBe(28992946232630000n);
  });

  it('tracks the minimum across multiple intra-window decreases', () => {
    const r = computeMinBalances({
      preItem: { timestamp: 900, balance: 100n },
      items: [
        { timestamp: 1100, balance: 80n },
        { timestamp: 1500, balance: 30n },
        { timestamp: 1800, balance: 60n },
      ],
      t0,
      t1,
    });
    expect(r.minBalance).toBe(30n);
  });

  it('is unaffected by deposits made after t0 (anti-gaming)', () => {
    // Held 40 at t0, then deposited up to 1000 mid-week -> min stays 40.
    const held = computeMinBalances({
      preItem: { timestamp: 900, balance: 40n },
      items: [{ timestamp: 1200, balance: 1000n }],
      t0,
      t1,
    });
    expect(held.minBalance).toBe(40n);

    // No balance before t0, fresh deposit mid-week -> min is 0 (start was 0).
    const fresh = computeMinBalances({
      preItem: undefined,
      items: [{ timestamp: 1200, balance: 1000n }],
      t0,
      t1,
    });
    expect(fresh.minBalance).toBe(0n);
  });
});
