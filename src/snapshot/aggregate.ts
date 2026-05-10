/**
 * Aggregate weekly per-user points into a cumulative season-to-date map.
 * Called for each completed week in order; the resulting map is what gets
 * encoded into the Merkle tree.
 */

export type Address = `0x${string}`;

export interface WeeklyTotals {
  weekNumber: number;
  totals: ReadonlyMap<Address, bigint>;
}

export type CumulativeTotals = Map<Address, bigint>;

export function mergeWeeklyIntoCumulative(
  cumulative: CumulativeTotals,
  weekly: WeeklyTotals,
): CumulativeTotals {
  // INVARIANT: cumulative amounts must never decrease (monotonic growth).
  // Each week's newRoot.cumulativeSupply >= prevRoot.cumulativeSupply.
  // If a week is skipped, the next root accounts for the gap.
  // This is enforced on-chain in K613S1Distributor.setMerkleRoot via NonMonotonicSupply check.
  for (const [user, weeklyAmount] of weekly.totals) {
    const prior = cumulative.get(user) ?? 0n;
    cumulative.set(user, prior + weeklyAmount);
  }
  return cumulative;
}

export function aggregateAllWeeks(weeks: readonly WeeklyTotals[]): CumulativeTotals {
  const out: CumulativeTotals = new Map();
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  for (const w of sorted) {
    mergeWeeklyIntoCumulative(out, w);
  }
  return out;
}
