import '../cli-setup.js';
import { Command } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../util/logger.js';
import { makeLeafValues } from '../merkle/leaf.js';
import { buildTree } from '../merkle/tree.js';
import { aggregateAllWeeks } from '../snapshot/aggregate.js';
import { loadWeeklyPoints } from '../snapshot/points-file.js';
import { buildLeaderboard, serializeLeaderboard } from '../snapshot/leaderboard.js';
import { getWeekWindow } from '../config/season.js';

const program = new Command();

program
  .name('build-tree')
  .description('Aggregate weeks 1..N into cumulative Merkle tree + leaderboard')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--in <dir>', 'snapshots directory', 'snapshots');

program.parse();

const opts = program.opts<{ week: number; in: string }>();

async function run() {
  try {
    // 1. Load weeks 1..N (fails loudly on any gap) and aggregate cumulatively.
    const { weeks, weekN } = await loadWeeklyPoints(opts.in, opts.week);
    const cumulative = aggregateAllWeeks(weeks);

    // 2. Build the Merkle tree from cumulative totals. buildTree() stringifies
    //    the bigint amounts, so tree.dump() stays JSON-serializable.
    const leaves = makeLeafValues(cumulative);
    const tree = buildTree(leaves);
    const cumulativeSupply = leaves.reduce((acc, [, amount]) => acc + amount, 0n);

    const weekDir = join(opts.in, `week-${opts.week}`);
    await mkdir(weekDir, { recursive: true });

    const treeData = {
      root: tree.root,
      cumulativeSupply: cumulativeSupply.toString(),
      tree: tree.dump(),
      leaves: leaves.length,
    };
    const treePath = join(weekDir, 'tree.json');
    await writeFile(treePath, JSON.stringify(treeData, null, 2));

    // 3. Leaderboard from the SAME cumulative map (no divergence possible).
    const window = getWeekWindow(opts.week);
    const leaderboard = serializeLeaderboard(
      buildLeaderboard({
        week: opts.week,
        weekStart: window.startTimestamp,
        weekEnd: window.endTimestamp,
        finalizedAt: new Date().toISOString(),
        cumulative,
        weekN,
      }),
    );
    const leaderboardPath = join(weekDir, 'leaderboard.json');
    await writeFile(leaderboardPath, JSON.stringify(leaderboard, null, 2));

    logger.info(
      {
        treePath,
        leaderboardPath,
        leaves: leaves.length,
        root: tree.root,
        cumulativeSupply: cumulativeSupply.toString(),
      },
      'Tree + leaderboard built',
    );
  } catch (error) {
    logger.error(error, 'Build tree failed');
    process.exit(1);
  }
}

run();
