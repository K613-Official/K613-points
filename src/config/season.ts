import { cleanEnv } from './env.js';

export const SECONDS_PER_DAY = 24 * 60 * 60;
export const WEEK_DURATION_SECONDS = 7 * SECONDS_PER_DAY;

export interface WeekWindow {
  weekNumber: number;
  startTimestamp: number;
  endTimestamp: number;
}

/** Resolve the configured season start, throwing a clear error if unset. */
export function resolveSeasonStart(seasonStart?: number): number {
  const start = seasonStart ?? cleanEnv().SEASON_1_START_TIMESTAMP;
  if (!Number.isInteger(start) || start <= 0) {
    throw new Error(
      `SEASON_1_START_TIMESTAMP is not configured (got ${start}). ` +
        `Set it in .env to the unix seconds of week-1 start.`,
    );
  }
  return start;
}

export function getWeekWindow(weekNumber: number, seasonStart?: number): WeekWindow {
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    throw new Error(`weekNumber must be a positive integer, got ${weekNumber}`);
  }
  const start = resolveSeasonStart(seasonStart);
  const startTimestamp = start + (weekNumber - 1) * WEEK_DURATION_SECONDS;
  const endTimestamp = startTimestamp + WEEK_DURATION_SECONDS;
  return { weekNumber, startTimestamp, endTimestamp };
}

export type PointsMultiplier = {
  readonly supply: bigint;
  readonly borrow: bigint;
};

export const POINTS_MULTIPLIER: PointsMultiplier = {
  supply: 1n,
  borrow: 2n,
};
