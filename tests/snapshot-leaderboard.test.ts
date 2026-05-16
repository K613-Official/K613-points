import { describe, expect, it } from 'vitest';
import { buildLeaderboard, serializeLeaderboard } from '../src/snapshot/leaderboard.js';
import type { UserPointsEntry } from '../src/snapshot/points-file.js';

const A = '0xaaaa000000000000000000000000000000000000' as const;
const B = '0xbbbb000000000000000000000000000000000000' as const;
const C = '0xcccc000000000000000000000000000000000000' as const;

describe('buildLeaderboard', () => {
  it('ranks by cumulativePoints desc, tie-break address asc, drops <=0', () => {
    const cumulative = new Map<`0x${string}`, bigint>([
      [A, 100n],
      [B, 100n],
      [C, 0n],
    ]);
    const weekN = new Map<`0x${string}`, UserPointsEntry>([
      [A, { points: 40n, supplyUsd: 30n, borrowUsd: 5n }],
    ]);
    const lb = buildLeaderboard({
      week: 2,
      weekStart: 1000,
      weekEnd: 1604800,
      finalizedAt: '2026-05-16T00:00:00.000Z',
      cumulative,
      weekN,
    });

    expect(lb.rows.map((r) => r.address)).toEqual([A, B]); // C dropped, tie-break A<B
    expect(lb.rows[0]).toMatchObject({ rank: 1, address: A, minSupplyUsd: 30n, weeklyPoints: 40n });
    // B has no week-N entry -> zeros, still present (cumulative>0)
    expect(lb.rows[1]).toMatchObject({
      rank: 2,
      address: B,
      minSupplyUsd: 0n,
      minBorrowUsd: 0n,
      weeklyPoints: 0n,
      cumulativePoints: 100n,
    });
    expect(lb.totalPoints).toBe(200n);
  });

  it('higher cumulative ranks first regardless of address order', () => {
    const lb = buildLeaderboard({
      week: 1,
      weekStart: 1000,
      weekEnd: 1604800,
      finalizedAt: 'x',
      cumulative: new Map<`0x${string}`, bigint>([
        [A, 5n],
        [B, 999n],
      ]),
      weekN: new Map(),
    });
    expect(lb.rows.map((r) => [r.rank, r.address])).toEqual([
      [1, B],
      [2, A],
    ]);
  });

  it('serializes all amounts as strings', () => {
    const lb = buildLeaderboard({
      week: 1,
      weekStart: 1,
      weekEnd: 2,
      finalizedAt: 'ts',
      cumulative: new Map<`0x${string}`, bigint>([[A, 7n]]),
      weekN: new Map<`0x${string}`, UserPointsEntry>([
        [A, { points: 7n, supplyUsd: 3n, borrowUsd: 2n }],
      ]),
    });
    const s = serializeLeaderboard(lb);
    expect(s.totalPoints).toBe('7');
    expect(s.rows[0]).toEqual({
      rank: 1,
      address: A,
      minSupplyUsd: '3',
      minBorrowUsd: '2',
      weeklyPoints: '7',
      cumulativePoints: '7',
    });
  });
});
