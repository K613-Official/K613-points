import type { Address } from './aggregate.js';
import type { UserPointsEntry } from './points-file.js';

export interface LeaderboardRow {
  rank: number;
  address: Address;
  minSupplyUsd: bigint;
  minBorrowUsd: bigint;
  weeklyPoints: bigint;
  cumulativePoints: bigint;
}

export interface Leaderboard {
  week: number;
  weekStart: number;
  weekEnd: number;
  finalizedAt: string;
  totalPoints: bigint;
  rows: LeaderboardRow[];
}

export interface BuildLeaderboardInput {
  week: number;
  weekStart: number;
  weekEnd: number;
  finalizedAt: string;
  /** Cumulative season-to-date totals (weeks 1..N) — same map used for the tree. */
  cumulative: ReadonlyMap<Address, bigint>;
  /** Per-user week-N breakdown (may omit users active only in earlier weeks). */
  weekN: ReadonlyMap<Address, UserPointsEntry>;
}

export function buildLeaderboard(input: BuildLeaderboardInput): Leaderboard {
  const rows: LeaderboardRow[] = [];
  for (const [addrRaw, cum] of input.cumulative) {
    if (cum <= 0n) {
      continue;
    }
    const address = addrRaw.toLowerCase() as Address;
    const wk = input.weekN.get(address);
    rows.push({
      rank: 0,
      address,
      minSupplyUsd: wk?.supplyUsd ?? 0n,
      minBorrowUsd: wk?.borrowUsd ?? 0n,
      weeklyPoints: wk?.points ?? 0n,
      cumulativePoints: cum,
    });
  }

  rows.sort((a, b) => {
    if (a.cumulativePoints !== b.cumulativePoints) {
      return a.cumulativePoints > b.cumulativePoints ? -1 : 1;
    }
    if (a.address < b.address) {
      return -1;
    }
    if (a.address > b.address) {
      return 1;
    }
    return 0;
  });
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  const totalPoints = rows.reduce((acc, r) => acc + r.cumulativePoints, 0n);

  return {
    week: input.week,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    finalizedAt: input.finalizedAt,
    totalPoints,
    rows,
  };
}

export function serializeLeaderboard(lb: Leaderboard) {
  return {
    week: lb.week,
    weekStart: lb.weekStart,
    weekEnd: lb.weekEnd,
    finalizedAt: lb.finalizedAt,
    totalPoints: lb.totalPoints.toString(),
    rows: lb.rows.map((r) => ({
      rank: r.rank,
      address: r.address,
      minSupplyUsd: r.minSupplyUsd.toString(),
      minBorrowUsd: r.minBorrowUsd.toString(),
      weeklyPoints: r.weeklyPoints.toString(),
      cumulativePoints: r.cumulativePoints.toString(),
    })),
  };
}
