import { z } from 'zod';
import { readJson } from '../util/json.js';

const HexAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);

const BonusKindSchema = z.enum(['og', 'social', 'contributor', 'other']);

const ManualBonusSchema = z.object({
  address: HexAddress.transform((s): `0x${string}` => s.toLowerCase() as `0x${string}`),
  amount: z.union([z.string(), z.number()]).transform((v): bigint => BigInt(v)),
  kind: BonusKindSchema.default('other'),
  note: z.string().optional(),
});

export const ManualBonusListSchema = z.object({
  weekNumber: z.number().int().positive(),
  bonuses: z.array(ManualBonusSchema),
});

export type ManualBonus = z.infer<typeof ManualBonusSchema>;
export type ManualBonusList = z.infer<typeof ManualBonusListSchema>;

export async function loadManualBonuses(path: string): Promise<ManualBonusList> {
  const raw = await readJson<unknown>(path);
  return ManualBonusListSchema.parse(raw);
}
