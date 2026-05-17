import { describe, expect, it } from 'vitest';
import {
  computeGalxeBonus,
  serializeCreditedState,
  parseCreditedState,
  toBonusFileJSON,
  type Address,
} from '../src/galxe/bonus.js';
import { ManualBonusListSchema } from '../src/snapshot/manual-bonuses.js';

const A = '0xaaaa000000000000000000000000000000000000' as const;
const B = '0xbbbb000000000000000000000000000000000000' as const;
const W = 100n; // simple weight for arithmetic clarity
const weight = () => W;

describe('computeGalxeBonus', () => {
  it('no prior: emits full weight per completed campaign, sums across campaigns', () => {
    const r = computeGalxeBonus({
      weekNumber: 1,
      participantsByCampaign: [
        { campaignId: 'c1', addresses: [A, B] },
        { campaignId: 'c2', addresses: [A] },
      ],
      priorCredited: new Map(),
      weightFor: weight,
    });
    const byAddr = Object.fromEntries(r.bonusList.bonuses.map((b) => [b.address, b.amount]));
    expect(byAddr[A]).toBe(200n); // c1 + c2
    expect(byAddr[B]).toBe(100n);
    expect(r.bonusList.weekNumber).toBe(1);
    expect(r.bonusList.bonuses.every((b) => b.kind === 'social')).toBe(true);
    expect(r.credited.get(A)).toBe(200n);
  });

  it('emits only the delta vs priorCredited; no row when nothing new', () => {
    const r = computeGalxeBonus({
      weekNumber: 2,
      participantsByCampaign: [{ campaignId: 'c1', addresses: [A, B] }],
      priorCredited: new Map<Address, bigint>([
        [A, 100n], // already fully credited -> no row
        [B, 40n], // partial -> delta 60
      ]),
      weightFor: weight,
    });
    const byAddr = Object.fromEntries(r.bonusList.bonuses.map((b) => [b.address, b.amount]));
    expect(byAddr[A]).toBeUndefined();
    expect(byAddr[B]).toBe(60n);
    expect(r.credited.get(A)).toBe(100n);
    expect(r.credited.get(B)).toBe(100n);
  });

  it('monotonic: a disappeared completion never claws back (delta 0, credited kept)', () => {
    const r = computeGalxeBonus({
      weekNumber: 3,
      participantsByCampaign: [{ campaignId: 'c1', addresses: [A] }],
      priorCredited: new Map<Address, bigint>([[A, 300n]]),
      weightFor: weight,
    });
    expect(r.bonusList.bonuses).toHaveLength(0);
    expect(r.credited.get(A)).toBe(300n);
  });

  it('lowercases and dedups addresses within a campaign', () => {
    const r = computeGalxeBonus({
      weekNumber: 1,
      participantsByCampaign: [
        { campaignId: 'c1', addresses: ['0xAAAA000000000000000000000000000000000000', A] },
      ],
      priorCredited: new Map(),
      weightFor: weight,
    });
    expect(r.bonusList.bonuses).toHaveLength(1);
    expect(r.bonusList.bonuses[0]).toMatchObject({ address: A, amount: 100n });
  });

  it('empty participation -> empty bonus list', () => {
    const r = computeGalxeBonus({
      weekNumber: 1,
      participantsByCampaign: [],
      priorCredited: new Map(),
      weightFor: weight,
    });
    expect(r.bonusList.bonuses).toHaveLength(0);
    expect(r.credited.size).toBe(0);
  });

  it('output is a valid ManualBonusList (consumable by apply-bonuses)', () => {
    const r = computeGalxeBonus({
      weekNumber: 4,
      participantsByCampaign: [{ campaignId: 'c1', addresses: [A] }],
      priorCredited: new Map(),
      weightFor: weight,
    });
    const parsed = ManualBonusListSchema.parse(toBonusFileJSON(r.bonusList));
    expect(parsed.weekNumber).toBe(4);
    expect(parsed.bonuses[0]).toMatchObject({ address: A, amount: 100n, kind: 'social' });
  });
});

describe('credited state round-trip', () => {
  it('serialize -> parse preserves bigint amounts and lowercases', () => {
    const s = serializeCreditedState({
      spaceId: '86004',
      credited: new Map<Address, bigint>([[A, 250n]]),
    });
    expect(s).toEqual({ spaceId: '86004', credited: { [A]: '250' } });
    const back = parseCreditedState(JSON.parse(JSON.stringify(s)));
    expect(back.spaceId).toBe('86004');
    expect(back.credited.get(A)).toBe(250n);
  });

  it('parse tolerates empty/missing input', () => {
    expect(parseCreditedState(undefined).credited.size).toBe(0);
    expect(parseCreditedState({}).spaceId).toBe('');
  });
});
