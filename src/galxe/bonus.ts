import type { ManualBonusList } from '../snapshot/manual-bonuses.js';

export type Address = `0x${string}`;

/** 1 point in our 18-decimal fixed-point unit. */
export const POINT = 10n ** 18n;

/** A single (address, total loyalty points) row from Galxe's leaderboard. */
export interface AddressPointsRow {
  address: string;
  /** Total points earned by this address in the space (Galxe-aggregated). */
  points: number;
}

/**
 * Total Galxe points already emitted to an address in prior weeks. Persisted
 * between runs so each week only emits the *delta* — required because
 * build-tree sums weeks 1..N (a full re-dump every week would multiply-count).
 */
export interface CreditedState {
  spaceId: string;
  credited: Map<Address, bigint>;
}

export interface SerializedCreditedState {
  spaceId: string;
  credited: Record<string, string>;
}

export interface ComputeInput {
  weekNumber: number;
  /** Current Galxe leaderboard for the space (address → total points). */
  leaderboard: readonly AddressPointsRow[];
  /** Address → total Galxe points already credited in prior weeks (in 1e18-wei). */
  priorCredited: ReadonlyMap<Address, bigint>;
}

export interface ComputeResult {
  /** Week-N incremental bonus (only addresses with a positive delta). */
  bonusList: ManualBonusList;
  /** Updated cumulative credited map (monotonic non-decreasing). */
  credited: Map<Address, bigint>;
}

function lc(a: string): Address {
  return a.toLowerCase() as Address;
}

function byAddr(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 * Reconcile the live Galxe leaderboard against what was already credited.
 *
 * desired[addr] = leaderboard.points × POINT       (Galxe-authoritative total).
 * delta[addr]   = max(0, desired - priorCredited)  (never claws back).
 *
 * Emits only positive deltas as a `social` ManualBonusList for week N and
 * returns the new cumulative `credited` map to persist.
 */
export function computeGalxeBonus(input: ComputeInput): ComputeResult {
  const desired = new Map<Address, bigint>();
  for (const row of input.leaderboard) {
    if (row.points <= 0) {
      continue;
    }
    const addr = lc(row.address);
    // Last write wins on dup addresses (leaderboard should be unique anyway).
    desired.set(addr, BigInt(Math.trunc(row.points)) * POINT);
  }

  const credited = new Map<Address, bigint>();
  for (const [addr, amt] of input.priorCredited) {
    credited.set(lc(addr), amt);
  }

  // Also iterate over addresses that exist only in priorCredited (so monotonic
  // credited carries them forward even when they drop off the leaderboard).
  const allAddresses = new Set<Address>([...desired.keys(), ...credited.keys()]);

  const bonuses: ManualBonusList['bonuses'] = [];
  for (const addr of [...allAddresses].sort(byAddr)) {
    const want = desired.get(addr) ?? 0n;
    const prior = credited.get(addr) ?? 0n;
    const delta = want - prior;
    if (delta > 0n) {
      bonuses.push({
        address: addr,
        amount: delta,
        kind: 'social',
        note: `galxe week ${input.weekNumber}`,
      });
    }
    // Monotonic: credited never decreases even if a leaderboard entry shrinks.
    credited.set(addr, prior > want ? prior : want);
  }

  return {
    bonusList: { weekNumber: input.weekNumber, bonuses },
    credited,
  };
}

export function serializeCreditedState(state: CreditedState): SerializedCreditedState {
  const credited: Record<string, string> = {};
  for (const [addr, amt] of [...state.credited.entries()].sort(([a], [b]) => byAddr(a, b))) {
    credited[lc(addr)] = amt.toString();
  }
  return { spaceId: state.spaceId, credited };
}

export function parseCreditedState(raw: unknown): CreditedState {
  const obj = (raw ?? {}) as Partial<SerializedCreditedState>;
  const credited = new Map<Address, bigint>();
  for (const [addr, amt] of Object.entries(obj.credited ?? {})) {
    credited.set(lc(addr), BigInt(amt));
  }
  return { spaceId: obj.spaceId ?? '', credited };
}

/** JSON-ready ManualBonusList (amount as string — matches loadManualBonuses). */
export function toBonusFileJSON(list: ManualBonusList) {
  return {
    weekNumber: list.weekNumber,
    bonuses: list.bonuses.map((b) => ({
      address: b.address,
      amount: b.amount.toString(),
      kind: b.kind,
      ...(b.note === undefined ? {} : { note: b.note }),
    })),
  };
}
