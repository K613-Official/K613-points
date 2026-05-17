/**
 * Points awarded per completed Galxe campaign (quest). Same units as the rest
 * of the pipeline: 18-decimal fixed point (1 point == 1e18), so these values
 * fold cleanly into points.json / merkle leaves.
 *
 * Tune here, not in code. `DEFAULT_QUEST_WEIGHT` applies to any campaign id
 * not listed in `QUEST_WEIGHTS`.
 */
export const POINT = 10n ** 18n;

export const DEFAULT_QUEST_WEIGHT: bigint = 100n * POINT;

/** Per-campaign overrides keyed by Galxe campaign id. */
export const QUEST_WEIGHTS: Readonly<Record<string, bigint>> = {
  // 'GCxxxxxxxx': 250n * POINT,
};

export function weightFor(campaignId: string): bigint {
  return QUEST_WEIGHTS[campaignId] ?? DEFAULT_QUEST_WEIGHT;
}
