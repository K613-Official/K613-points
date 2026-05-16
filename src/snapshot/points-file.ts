import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Address, WeeklyTotals } from './aggregate.js';

export interface UserPointsEntry {
  points: bigint;
  supplyUsd: bigint;
  borrowUsd: bigint;
}

export interface PointsFile {
  week: number;
  timestamp: string;
  startTimestamp: number;
  endTimestamp: number;
  userPoints: Map<Address, UserPointsEntry>;
}

interface SerializedEntry {
  points: string;
  supplyUsd: string;
  borrowUsd: string;
}

export interface SerializedPointsFile {
  week: number;
  timestamp: string;
  startTimestamp: number;
  endTimestamp: number;
  userPoints: Record<string, SerializedEntry>;
}

export function serializePointsFile(file: PointsFile): SerializedPointsFile {
  const sorted = [...file.userPoints.entries()]
    .map(([addr, e]) => [addr.toLowerCase() as Address, e] as const)
    .sort(([a], [b]) => {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
  return {
    week: file.week,
    timestamp: file.timestamp,
    startTimestamp: file.startTimestamp,
    endTimestamp: file.endTimestamp,
    userPoints: Object.fromEntries(
      sorted.map(([addr, e]) => [
        addr,
        {
          points: e.points.toString(),
          supplyUsd: e.supplyUsd.toString(),
          borrowUsd: e.borrowUsd.toString(),
        },
      ]),
    ),
  };
}

export function parsePointsFile(raw: unknown): PointsFile {
  const obj = raw as SerializedPointsFile;
  const userPoints = new Map<Address, UserPointsEntry>();
  for (const [addr, e] of Object.entries(obj.userPoints ?? {})) {
    userPoints.set(addr.toLowerCase() as Address, {
      points: BigInt(e.points),
      supplyUsd: BigInt(e.supplyUsd),
      borrowUsd: BigInt(e.borrowUsd),
    });
  }
  return {
    week: obj.week,
    timestamp: obj.timestamp,
    startTimestamp: obj.startTimestamp,
    endTimestamp: obj.endTimestamp,
    userPoints,
  };
}

export interface WeeklyPointsLoad {
  /** One WeeklyTotals per week 1..N (points totals only). */
  weeks: WeeklyTotals[];
  /** Per-user weekly breakdown for week N. */
  weekN: Map<Address, UserPointsEntry>;
}

export async function loadWeeklyPoints(snapshotsDir: string, n: number): Promise<WeeklyPointsLoad> {
  const weeks: WeeklyTotals[] = [];
  const missing: number[] = [];
  let weekN = new Map<Address, UserPointsEntry>();

  for (let w = 1; w <= n; w++) {
    const path = join(snapshotsDir, `week-${w}`, 'points.json');
    let raw: string;
    try {
      // Sequential by design: weeks 1..N read in order, missing weeks collected
      // for a single ordered error. N is small (a season is ~12 weeks).
      // eslint-disable-next-line no-await-in-loop
      raw = await readFile(path, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        missing.push(w);
        continue;
      }
      throw new Error(`Failed to read ${path}: ${(err as Error).message}`);
    }
    let parsed: PointsFile;
    try {
      parsed = parsePointsFile(JSON.parse(raw));
    } catch (err) {
      throw new Error(`Invalid points.json at ${path}: ${(err as Error).message}`);
    }
    const totals = new Map<Address, bigint>();
    for (const [addr, e] of parsed.userPoints) {
      totals.set(addr, e.points);
    }
    weeks.push({ weekNumber: w, totals });
    if (w === n) {
      weekN = parsed.userPoints;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing or unreadable points.json for week(s): ${missing.join(', ')}. ` +
        `All weeks 1..${n} must exist (snapshots are a git audit trail).`,
    );
  }

  return { weeks, weekN };
}
