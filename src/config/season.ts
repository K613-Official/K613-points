export const SECONDS_PER_DAY = 24 * 60 * 60;
export const WEEK_DURATION_SECONDS = 7 * SECONDS_PER_DAY;

// TODO: set the real season-1 start timestamp once the campaign goes live.
export const SEASON_1_START_TIMESTAMP: number = 0;

export interface WeekWindow {
  weekNumber: number;
  startTimestamp: number;
  endTimestamp: number;
}

export function getWeekWindow(weekNumber: number): WeekWindow {
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    throw new Error(`weekNumber must be a positive integer, got ${weekNumber}`);
  }
  const startTimestamp = SEASON_1_START_TIMESTAMP + (weekNumber - 1) * WEEK_DURATION_SECONDS;
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
