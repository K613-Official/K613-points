import { POINTS_MULTIPLIER } from '../config/season.js';

export interface UserReservePoints {
  user: `0x${string}`;
  reserve: `0x${string}`;
  reserveSymbol: string;
  supplyUsd: bigint;
  borrowUsd: bigint;
  supplyPoints: bigint;
  borrowPoints: bigint;
  totalPoints: bigint;
}

export interface PointsInput {
  user: `0x${string}`;
  reserve: `0x${string}`;
  reserveSymbol: string;
  supplyUsd: bigint;
  borrowUsd: bigint;
}

/**
 * Convert USD supply/borrow values to weekly points.
 * supplyPoints = supplyUsd * 1
 * borrowPoints = borrowUsd * 2
 */
export function computePoints(input: PointsInput): UserReservePoints {
  const supplyPoints = input.supplyUsd * POINTS_MULTIPLIER.supply;
  const borrowPoints = input.borrowUsd * POINTS_MULTIPLIER.borrow;
  return {
    user: input.user,
    reserve: input.reserve,
    reserveSymbol: input.reserveSymbol,
    supplyUsd: input.supplyUsd,
    borrowUsd: input.borrowUsd,
    supplyPoints,
    borrowPoints,
    totalPoints: supplyPoints + borrowPoints,
  };
}
