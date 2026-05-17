import { describe, expect, it } from 'vitest';
import { applyBonuses, bonusListHash, assertBonusWeek } from '../src/snapshot/apply-bonuses.js';
import type { PointsFile } from '../src/snapshot/points-file.js';
import type { ManualBonusList } from '../src/snapshot/manual-bonuses.js';

const A = '0xaaaa000000000000000000000000000000000000' as const;
const B = '0xbbbb000000000000000000000000000000000000' as const;

function points(entries: Array<[string, bigint, bigint, bigint]> = []): PointsFile {
  return {
    week: 1,
    timestamp: '2026-05-17T00:00:00.000Z',
    startTimestamp: 100,
    endTimestamp: 200,
    userPoints: new Map(
      entries.map(([a, p, s, b]) => [
        a.toLowerCase() as `0x${string}`,
        { points: p, supplyUsd: s, borrowUsd: b },
      ]),
    ),
  };
}

function list(
  weekNumber: number,
  bonuses: Array<[string, bigint, ManualBonusList['bonuses'][number]['kind']]>,
): ManualBonusList {
  return {
    weekNumber,
    bonuses: bonuses.map(([address, amount, kind]) => ({
      address: address.toLowerCase() as `0x${string}`,
      amount,
      kind,
    })),
  };
}

describe('applyBonuses', () => {
  it('adds amount to existing user points, leaves supplyUsd/borrowUsd untouched', () => {
    const r = applyBonuses(points([[A, 100n, 80n, 10n]]), list(1, [[A, 50n, 'social']]));
    expect(r.applied).toBe(true);
    const e = r.points.userPoints.get(A);
    expect(e).toEqual({ points: 150n, supplyUsd: 80n, borrowUsd: 10n });
  });

  it('creates a new entry for an unseen address', () => {
    const r = applyBonuses(points([[A, 100n, 100n, 0n]]), list(1, [[B, 25n, 'og']]));
    expect(r.points.userPoints.get(B)).toEqual({ points: 25n, supplyUsd: 0n, borrowUsd: 0n });
    expect(r.points.userPoints.get(A)).toEqual({ points: 100n, supplyUsd: 100n, borrowUsd: 0n });
  });

  it('sums multiple rows for the same address', () => {
    const r = applyBonuses(
      points(),
      list(1, [
        [A, 10n, 'social'],
        [A, 5n, 'contributor'],
      ]),
    );
    expect(r.points.userPoints.get(A)?.points).toBe(15n);
  });

  it('does not mutate the input PointsFile', () => {
    const input = points([[A, 100n, 1n, 2n]]);
    applyBonuses(input, list(1, [[A, 50n, 'social']]));
    expect(input.userPoints.get(A)?.points).toBe(100n);
    expect(input.appliedBonusHashes).toBeUndefined();
  });

  it('is idempotent: re-applying the same list is a no-op', () => {
    const l = list(1, [[A, 50n, 'social']]);
    const first = applyBonuses(points([[A, 100n, 0n, 0n]]), l);
    expect(first.applied).toBe(true);
    const second = applyBonuses(first.points, l);
    expect(second.applied).toBe(false);
    expect(second.affected).toBe(0);
    expect(second.points.userPoints.get(A)?.points).toBe(150n);
    expect(second.points.appliedBonusHashes).toEqual([first.hash]);
  });

  it('accumulates two different lists (both hashes recorded)', () => {
    const first = applyBonuses(points([[A, 100n, 0n, 0n]]), list(1, [[A, 10n, 'og']]));
    const second = applyBonuses(first.points, list(1, [[A, 7n, 'social']]));
    expect(second.applied).toBe(true);
    expect(second.points.userPoints.get(A)?.points).toBe(117n);
    expect(second.points.appliedBonusHashes).toHaveLength(2);
  });

  it('empty bonus list: applied but affected 0, userPoints unchanged', () => {
    const r = applyBonuses(points([[A, 100n, 1n, 2n]]), list(1, []));
    expect(r.applied).toBe(true);
    expect(r.affected).toBe(0);
    expect(r.points.userPoints.get(A)).toEqual({ points: 100n, supplyUsd: 1n, borrowUsd: 2n });
    expect(r.points.appliedBonusHashes).toHaveLength(1);
  });
});

describe('bonusListHash', () => {
  it('is stable regardless of bonus ordering', () => {
    const h1 = bonusListHash(
      list(1, [
        [A, 10n, 'og'],
        [B, 20n, 'social'],
      ]),
    );
    const h2 = bonusListHash(
      list(1, [
        [B, 20n, 'social'],
        [A, 10n, 'og'],
      ]),
    );
    expect(h1).toBe(h2);
  });

  it('changes when week or amounts change', () => {
    expect(bonusListHash(list(1, [[A, 10n, 'og']]))).not.toBe(
      bonusListHash(list(2, [[A, 10n, 'og']])),
    );
    expect(bonusListHash(list(1, [[A, 10n, 'og']]))).not.toBe(
      bonusListHash(list(1, [[A, 11n, 'og']])),
    );
  });
});

describe('assertBonusWeek', () => {
  it('passes when weeks match', () => {
    expect(() => assertBonusWeek(list(3, []), 3)).not.toThrow();
  });
  it('throws on week mismatch', () => {
    expect(() => assertBonusWeek(list(2, []), 5)).toThrow(/weekNumber \(2\).*--week 5/);
  });
});
