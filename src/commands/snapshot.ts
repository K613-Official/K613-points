import '../cli-setup.js';
import { Command } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../util/logger.js';
import { getWeekWindow } from '../config/season.js';
import { cleanEnv } from '../config/env.js';
import { getPublicClient } from '../chain/clients.js';
import { getSubgraphClient } from '../subgraph/client.js';
import {
  ACTIVE_RESERVES_QUERY,
  USERS_WITH_BALANCE_QUERY,
  ATOKEN_HISTORY_QUERY,
  VTOKEN_HISTORY_QUERY,
} from '../subgraph/queries.js';
import { computeMinBalances } from '../snapshot/min-balance.js';
import { filterReservesNotFrozenAtT0 } from '../subgraph/reserve-config.js';
import { fetchPrices } from '../snapshot/price.js';
import { computePoints } from '../snapshot/points.js';

const PAGE_SIZE = 1000;

const program = new Command();

program
  .name('snapshot')
  .description('Read subgraph for week N and write snapshots/week-N/points.json')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--out <dir>', 'output directory', 'snapshots');

program.parse();

const opts = program.opts<{ week: number; out: string }>();

interface ReserveInfo {
  id: string;
  symbol: string;
  decimals: number;
  underlyingAsset: string;
  aToken: { id: string };
  vToken: { id: string };
}

interface UserReserveRecord {
  user: { id: string };
  reserve: { id: string; symbol: string; decimals: number };
}

async function fetchAllUserReserves(
  subgraphClient: ReturnType<typeof getSubgraphClient>,
  endTimestamp: number,
): Promise<UserReserveRecord[]> {
  const all: UserReserveRecord[] = [];
  let skip = 0;

  while (true) {
    const page = await subgraphClient.request<{
      userReserves: UserReserveRecord[];
    }>(USERS_WITH_BALANCE_QUERY, {
      first: PAGE_SIZE,
      skip,
      endTimestamp,
    });

    all.push(...page.userReserves);
    if (page.userReserves.length < PAGE_SIZE) {
      break;
    }
    skip += PAGE_SIZE;
  }

  return all;
}

interface BalanceHistoryResponse {
  items: Array<{ timestamp: number; balance: bigint }>;
  preItem: Array<{ timestamp: number; balance: bigint }>;
}

async function fetchATokenHistory(
  subgraphClient: ReturnType<typeof getSubgraphClient>,
  userReserveId: string,
  t0: number,
  t1: number,
): Promise<BalanceHistoryResponse> {
  const res = await subgraphClient.request<{
    items: Array<{ timestamp: number; currentATokenBalance: bigint }>;
    preItem: Array<{ timestamp: number; currentATokenBalance: bigint }>;
  }>(ATOKEN_HISTORY_QUERY, {
    userReserve: userReserveId,
    startTimestamp: t0,
    endTimestamp: t1,
  });
  return {
    items: res.items.map((x) => ({ timestamp: x.timestamp, balance: x.currentATokenBalance })),
    preItem: res.preItem.map((x) => ({ timestamp: x.timestamp, balance: x.currentATokenBalance })),
  };
}

async function fetchVTokenHistory(
  subgraphClient: ReturnType<typeof getSubgraphClient>,
  userReserveId: string,
  t0: number,
  t1: number,
): Promise<BalanceHistoryResponse> {
  const res = await subgraphClient.request<{
    items: Array<{ timestamp: number; currentVariableDebt: bigint }>;
    preItem: Array<{ timestamp: number; currentVariableDebt: bigint }>;
  }>(VTOKEN_HISTORY_QUERY, {
    userReserve: userReserveId,
    startTimestamp: t0,
    endTimestamp: t1,
  });
  return {
    items: res.items.map((x) => ({ timestamp: x.timestamp, balance: x.currentVariableDebt })),
    preItem: res.preItem.map((x) => ({ timestamp: x.timestamp, balance: x.currentVariableDebt })),
  };
}

async function run() {
  try {
    const week = getWeekWindow(opts.week);
    logger.info({ week }, 'Starting snapshot computation');

    const env = cleanEnv();
    if (!env.AAVE_ORACLE_ADDRESS) {
      throw new Error('AAVE_ORACLE_ADDRESS required in .env');
    }

    const publicClient = getPublicClient();
    const subgraphClient = getSubgraphClient();

    // 1. Fetch active reserves
    const reservesResponse = await subgraphClient.request<{
      reserves: ReserveInfo[];
    }>(ACTIVE_RESERVES_QUERY);
    const reserves = reservesResponse.reserves;
    logger.info({ count: reserves.length }, 'Fetched active reserves');

    // 2. Filter reserves not frozen at t0
    const eligibleReserves = await filterReservesNotFrozenAtT0(
      reserves.map((r) => ({ id: r.id, symbol: r.symbol })),
      week.startTimestamp,
    );
    const eligibleIds = new Set(eligibleReserves.map((r) => r.id.toLowerCase()));
    const activeReserves = reserves.filter((r) => eligibleIds.has(r.id.toLowerCase()));
    logger.info({ count: activeReserves.length }, 'Filtered non-frozen reserves');

    // 3. Fetch users with balance (with pagination)
    const userReserves = (await fetchAllUserReserves(subgraphClient, week.endTimestamp)).filter(
      (ur) => eligibleIds.has(ur.reserve.id.toLowerCase()),
    );
    logger.info({ count: userReserves.length }, 'Found user-reserve pairs');

    // 4. Fetch prices via AaveOracle (underlying assets, NOT reserve.id)
    const underlyingAssets = activeReserves.map((r) => r.underlyingAsset as `0x${string}`);
    const prices = await fetchPrices({
      client: publicClient,
      oracleAddress: env.AAVE_ORACLE_ADDRESS,
      assets: underlyingAssets,
    });
    logger.info({ count: prices.size }, 'Fetched asset prices');

    // 5. Compute points per user (supply + borrow)
    const userPoints = new Map<string, bigint>();
    const ORACLE_DECIMALS = 8n; // Aave v3 uses 8-decimal USD pricing

    for (const userReserve of userReserves) {
      const reserve = activeReserves.find(
        (r) => r.id.toLowerCase() === userReserve.reserve.id.toLowerCase(),
      );
      if (!reserve) {
        continue;
      }

      const userReserveId = `${userReserve.user.id.toLowerCase()}${reserve.id.toLowerCase()}`;
      const tokenDecimals = BigInt(reserve.decimals);
      const price = prices.get(reserve.underlyingAsset.toLowerCase() as `0x${string}`) ?? 0n;
      const priceScale = 10n ** (tokenDecimals + ORACLE_DECIMALS);

      // Supply: aToken min-balance
      const aHistory = await fetchATokenHistory(
        subgraphClient,
        userReserveId,
        week.startTimestamp,
        week.endTimestamp,
      );
      const aMin = computeMinBalances({
        preItem: aHistory.preItem[0],
        items: aHistory.items,
        t0: week.startTimestamp,
        t1: week.endTimestamp,
      });
      // USD = balance * price / 10^(tokenDecimals + 8) — keeps integer math safe
      const supplyUsd = (aMin.minBalance * price) / priceScale;

      // Borrow: vToken min-balance
      const vHistory = await fetchVTokenHistory(
        subgraphClient,
        userReserveId,
        week.startTimestamp,
        week.endTimestamp,
      );
      const vMin = computeMinBalances({
        preItem: vHistory.preItem[0],
        items: vHistory.items,
        t0: week.startTimestamp,
        t1: week.endTimestamp,
      });
      const borrowUsd = (vMin.minBalance * price) / priceScale;

      const points = computePoints({
        user: userReserve.user.id as `0x${string}`,
        reserve: reserve.id as `0x${string}`,
        reserveSymbol: reserve.symbol,
        supplyUsd,
        borrowUsd,
      });

      const current = userPoints.get(userReserve.user.id.toLowerCase()) ?? 0n;
      userPoints.set(userReserve.user.id.toLowerCase(), current + points.totalPoints);
    }

    // 6. Save snapshot
    const weekDir = join(opts.out, `week-${opts.week}`);
    await mkdir(weekDir, { recursive: true });

    const snapshot = {
      week: opts.week,
      timestamp: new Date().toISOString(),
      startTimestamp: week.startTimestamp,
      endTimestamp: week.endTimestamp,
      userPoints: Object.fromEntries(
        [...userPoints.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([addr, pts]) => [addr, pts.toString()]),
      ),
    };

    const outputPath = join(weekDir, 'points.json');
    await writeFile(outputPath, JSON.stringify(snapshot, null, 2));

    logger.info({ path: outputPath, users: userPoints.size }, 'Snapshot saved');
  } catch (error) {
    logger.error(error, 'Snapshot failed');
    process.exit(1);
  }
}

run();
