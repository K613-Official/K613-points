import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  serializePointsFile,
  parsePointsFile,
  loadWeeklyPoints,
  type PointsFile,
} from '../src/snapshot/points-file.js';

const A = '0xAAAA000000000000000000000000000000000000' as const;
const B = '0xbbbb000000000000000000000000000000000000' as const;

function fixture(week: number, entries: Array<[string, bigint, bigint, bigint]>): PointsFile {
  return {
    week,
    timestamp: '2026-05-16T00:00:00.000Z',
    startTimestamp: 0,
    endTimestamp: 604800,
    userPoints: new Map(
      entries.map(([addr, points, supplyUsd, borrowUsd]) => [
        addr.toLowerCase() as `0x${string}`,
        { points, supplyUsd, borrowUsd },
      ]),
    ),
  };
}

describe('points-file serialize/parse', () => {
  it('lowercases addresses, sorts keys, stringifies bigints', () => {
    const out = serializePointsFile(
      fixture(1, [
        [B, 30n, 10n, 10n],
        [A, 20n, 20n, 0n],
      ]),
    );
    const keys = Object.keys(out.userPoints);
    expect(keys).toEqual([A.toLowerCase(), B.toLowerCase()]);
    expect(out.userPoints[A.toLowerCase()]).toEqual({
      points: '20',
      supplyUsd: '20',
      borrowUsd: '0',
    });
  });

  it('round-trips through serialize -> JSON -> parse', () => {
    const original = fixture(2, [[A, 7n, 3n, 2n]]);
    const parsed = parsePointsFile(JSON.parse(JSON.stringify(serializePointsFile(original))));
    expect(parsed.week).toBe(2);
    expect(parsed.userPoints.get(A.toLowerCase() as `0x${string}`)).toEqual({
      points: 7n,
      supplyUsd: 3n,
      borrowUsd: 2n,
    });
  });
});

describe('loadWeeklyPoints', () => {
  it('loads weeks 1..N and exposes week-N breakdown', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'k613-'));
    try {
      for (const w of [1, 2]) {
        await mkdir(join(dir, `week-${w}`), { recursive: true });
        await writeFile(
          join(dir, `week-${w}`, 'points.json'),
          JSON.stringify(serializePointsFile(fixture(w, [[A, BigInt(w), BigInt(w), 0n]]))),
        );
      }
      const { weeks, weekN } = await loadWeeklyPoints(dir, 2);
      expect(weeks.map((x) => x.weekNumber)).toEqual([1, 2]);
      expect(weeks[0]?.totals.get(A.toLowerCase() as `0x${string}`)).toBe(1n);
      expect(weekN.get(A.toLowerCase() as `0x${string}`)?.points).toBe(2n);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws listing missing weeks', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'k613-'));
    try {
      await mkdir(join(dir, 'week-1'), { recursive: true });
      await writeFile(
        join(dir, 'week-1', 'points.json'),
        JSON.stringify(serializePointsFile(fixture(1, [[A, 1n, 1n, 0n]]))),
      );
      await expect(loadWeeklyPoints(dir, 3)).rejects.toThrow(/week\(s\): 2, 3/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
