import { createHash } from 'node:crypto';
import type { Address } from './aggregate.js';
import type { ManualBonusList } from './manual-bonuses.js';
import type { PointsFile } from './points-file.js';

/**
 * Stable content hash of a bonus list: weekNumber + sorted
 * `address|amount|kind` triples. Reordering or re-running the same list
 * yields the same hash (idempotency key).
 */
export function bonusListHash(list: ManualBonusList): string {
  const norm = list.bonuses
    .map((b) => `${b.address.toLowerCase()}|${b.amount.toString()}|${b.kind}`)
    .sort()
    .join(';');
  return createHash('sha256').update(`${list.weekNumber}:${norm}`).digest('hex');
}

/** Throw if the bonus file targets a different week than requested. */
export function assertBonusWeek(list: ManualBonusList, week: number): void {
  if (list.weekNumber !== week) {
    throw new Error(`Bonus file weekNumber (${list.weekNumber}) does not match --week ${week}`);
  }
}

export interface ApplyBonusesResult {
  /** New PointsFile (input is not mutated). Same object if already applied. */
  points: PointsFile;
  /** false = this exact list was already folded in (idempotent no-op). */
  applied: boolean;
  hash: string;
  /** Number of bonus rows folded in (0 when not applied or empty list). */
  affected: number;
}

/**
 * Fold a manual-bonus list additively into `points.userPoints[].points`.
 *
 * - bonus affects ONLY `points`; `supplyUsd`/`borrowUsd` are left untouched.
 *   The invariant `points == supplyUsd*1 + borrowUsd*2` is intentionally NOT
 *   preserved for bonused users (the leaf/cumulative must grow by the bonus).
 * - new addresses get `{ points: amount, supplyUsd: 0n, borrowUsd: 0n }`.
 * - multiple rows for the same address are summed.
 * - idempotent: re-applying the same list (same hash) is a no-op.
 */
export function applyBonuses(points: PointsFile, list: ManualBonusList): ApplyBonusesResult {
  const hash = bonusListHash(list);
  const already = points.appliedBonusHashes ?? [];
  if (already.includes(hash)) {
    return { points, applied: false, hash, affected: 0 };
  }

  const userPoints = new Map(points.userPoints);
  for (const b of list.bonuses) {
    const addr = b.address.toLowerCase() as Address;
    const prev = userPoints.get(addr) ?? { points: 0n, supplyUsd: 0n, borrowUsd: 0n };
    userPoints.set(addr, {
      points: prev.points + b.amount,
      supplyUsd: prev.supplyUsd,
      borrowUsd: prev.borrowUsd,
    });
  }

  return {
    points: { ...points, userPoints, appliedBonusHashes: [...already, hash] },
    applied: true,
    hash,
    affected: list.bonuses.length,
  };
}
