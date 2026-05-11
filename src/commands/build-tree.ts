import '../cli-setup.js';
import { Command } from 'commander';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { logger } from '../util/logger.js';
import { LEAF_TYPES, makeLeafValues } from '../merkle/leaf.js';

const program = new Command();

program
  .name('build-tree')
  .description('Read points.json for week N and build Merkle tree + leaderboard + proofs')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--in <dir>', 'snapshots directory', 'snapshots');

program.parse();

const opts = program.opts<{ week: number; in: string }>();

async function run() {
  try {
    const snapshotPath = join(opts.in, `week-${opts.week}`, 'points.json');
    const snapshotContent = await readFile(snapshotPath, 'utf-8');
    const snapshot = JSON.parse(snapshotContent);

    const userPoints = snapshot.userPoints as Record<string, string>;
    const totals = new Map(
      Object.entries(userPoints).map(([addr, points]) => [
        addr.toLowerCase() as `0x${string}`,
        BigInt(points),
      ]),
    );

    const leaves = makeLeafValues(totals);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tree = StandardMerkleTree.of(leaves as any, LEAF_TYPES as any);

    // Cumulative supply = sum of all leaf amounts (the contract uses this as the
    // monotonicity guard + weekly-mint-cap check).
    const cumulativeSupply = leaves.reduce((acc, [, amount]) => acc + amount, 0n);

    const weekDir = join(opts.in, `week-${opts.week}`);
    await mkdir(weekDir, { recursive: true });

    const treeData = {
      root: tree.root,
      cumulativeSupply: cumulativeSupply.toString(),
      tree: tree.dump(),
      leaves: leaves.length,
    };

    const outputPath = join(weekDir, 'tree.json');
    await writeFile(outputPath, JSON.stringify(treeData, null, 2));

    logger.info(
      {
        path: outputPath,
        leaves: leaves.length,
        root: tree.root,
        cumulativeSupply: cumulativeSupply.toString(),
      },
      'Tree built',
    );
  } catch (error) {
    logger.error(error, 'Build tree failed');
    process.exit(1);
  }
}

run();
