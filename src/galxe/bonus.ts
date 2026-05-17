import type { ManualBonusList } from '../snapshot/manual-bonuses.js';

export type Address = `0x${string}`;

/** Live Galxe data: which addresses have completed each campaign right now. */
export interface CampaignParticipants {
  campaignId: string;
  addresses: string[];
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
  participantsByCampaign: readonly CampaignParticipants[];
  /** Address -> total Galxe points already credited in prior weeks. */
  priorCredited: ReadonlyMap<Address, bigint>;
  /** campaignId -> points weight. */
  weightFor: (campaignId: string) => bigint;
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
 * Reconcile live Galxe participation against what was already credited.
 *
 * desired[addr] = Σ weight(campaign) over campaigns addr completed.
 * delta[addr]   = max(0, desired - priorCredited)   (never claws back).
 * Emits only positive deltas as a `social` ManualBonusList for week N;
 * returns the new cumulative `credited` map to persist.
 */
export function computeGalxeBonus(input: ComputeInput): ComputeResult {
  const desired = new Map<Address, bigint>();
  for (const { campaignId, addresses } of input.participantsByCampaign) {
    const w = input.weightFor(campaignId);
    // Dedup within a campaign: a wallet completing it counts once.
    const unique = new Set(addresses.map(lc));
    for (const addr of unique) {
      desired.set(addr, (desired.get(addr) ?? 0n) + w);
    }
  }

  const credited = new Map<Address, bigint>();
  for (const [addr, amt] of input.priorCredited) {
    credited.set(lc(addr), amt);
  }

  const bonuses: ManualBonusList['bonuses'] = [];
  for (const [addr, want] of [...desired.entries()].sort(([a], [b]) => byAddr(a, b))) {
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
    // Monotonic: credited never decreases even if a completion disappears.
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
