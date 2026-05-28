import { describe, expect, it } from 'vitest';
import {
  computeGalxeBonus,
  serializeCreditedState,
  parseCreditedState,
  toBonusFileJSON,
  POINT,
  type Address,
} from '../src/galxe/bonus.js';
import { ManualBonusListSchema } from '../src/snapshot/manual-bonuses.js';

const A = '0xaaaa000000000000000000000000000000000000' as const;
const B = '0xbbbb000000000000000000000000000000000000' as const;

describe('computeGalxeBonus', () => {
  it('no prior: each leaderboard row becomes a bonus = points × POINT', () => {
    const r = computeGalxeBonus({
      weekNumber: 1,
      leaderboard: [
        { address: A, points: 200 },
        { address: B, points: 100 },
      ],
      priorCredited: new Map(),
    });
    const byAddr = Object.fromEntries(r.bonusList.bonuses.map((b) => [b.address, b.amount]));
    expect(byAddr[A]).toBe(200n * POINT);
    expect(byAddr[B]).toBe(100n * POINT);
    expect(r.bonusList.bonuses.every((b) => b.kind === 'social')).toBe(true);
    expect(r.credited.get(A)).toBe(200n * POINT);
  });

  it('emits only the delta vs priorCredited; nothing when leaderboard <= prior', () => {
    const r = computeGalxeBonus({
      weekNumber: 2,
      leaderboard: [
        { address: A, points: 100 }, // already credited 100 -> no row
        { address: B, points: 100 }, // partial 40 -> delta 60
      ],
      priorCredited: new Map<Address, bigint>([
        [A, 100n * POINT],
        [B, 40n * POINT],
      ]),
    });
    const byAddr = Object.fromEntries(r.bonusList.bonuses.map((b) => [b.address, b.amount]));
    expect(byAddr[A]).toBeUndefined();
    expect(byAddr[B]).toBe(60n * POINT);
  });

  it('monotonic: leaderboard shrink for an address never claws back', () => {
    const r = computeGalxeBonus({
      weekNumber: 3,
      leaderboard: [{ address: A, points: 50 }], // dropped from 300
      priorCredited: new Map<Address, bigint>([[A, 300n * POINT]]),
    });
    expect(r.bonusList.bonuses).toHaveLength(0);
    expect(r.credited.get(A)).toBe(300n * POINT);
  });

  it('address that disappears from leaderboard entirely: credited preserved, no bonus', () => {
    const r = computeGalxeBonus({
      weekNumber: 3,
      leaderboard: [],
      priorCredited: new Map<Address, bigint>([[A, 150n * POINT]]),
    });
    expect(r.bonusList.bonuses).toHaveLength(0);
    expect(r.credited.get(A)).toBe(150n * POINT);
  });

  it('lowercases addresses', () => {
    const r = computeGalxeBonus({
      weekNumber: 1,
      leaderboard: [{ address: '0xAAAA000000000000000000000000000000000000', points: 10 }],
      priorCredited: new Map(),
    });
    expect(r.bonusList.bonuses).toHaveLength(1);
    expect(r.bonusList.bonuses[0]).toMatchObject({ address: A, amount: 10n * POINT });
  });

  it('skips leaderboard rows with points <= 0', () => {
    const r = computeGalxeBonus({
      weekNumber: 1,
      leaderboard: [
        { address: A, points: 0 },
        { address: B, points: 10 },
      ],
      priorCredited: new Map(),
    });
    expect(r.bonusList.bonuses).toHaveLength(1);
    expect(r.bonusList.bonuses[0]?.address).toBe(B);
  });

  it('empty leaderboard -> empty bonus list, empty credited', () => {
    const r = computeGalxeBonus({
      weekNumber: 1,
      leaderboard: [],
      priorCredited: new Map(),
    });
    expect(r.bonusList.bonuses).toHaveLength(0);
    expect(r.credited.size).toBe(0);
  });

  it('output is a valid ManualBonusList (consumable by apply-bonuses)', () => {
    const r = computeGalxeBonus({
      weekNumber: 4,
      leaderboard: [{ address: A, points: 25 }],
      priorCredited: new Map(),
    });
    const parsed = ManualBonusListSchema.parse(toBonusFileJSON(r.bonusList));
    expect(parsed.weekNumber).toBe(4);
    expect(parsed.bonuses[0]).toMatchObject({ address: A, amount: 25n * POINT, kind: 'social' });
  });
});

describe('credited state round-trip', () => {
  it('serialize -> parse preserves bigint amounts and lowercases', () => {
    const s = serializeCreditedState({
      spaceId: '86004',
      credited: new Map<Address, bigint>([[A, 250n * POINT]]),
    });
    expect(s.credited[A]).toBe((250n * POINT).toString());
    const back = parseCreditedState(JSON.parse(JSON.stringify(s)));
    expect(back.spaceId).toBe('86004');
    expect(back.credited.get(A)).toBe(250n * POINT);
  });

  it('parse tolerates empty/missing input', () => {
    expect(parseCreditedState(undefined).credited.size).toBe(0);
    expect(parseCreditedState({}).spaceId).toBe('');
  });
});
