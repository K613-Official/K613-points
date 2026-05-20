import '../cli-setup.js';
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../util/logger.js';
import { postMerkleRoot, readDistributorState } from '../chain/distributor.js';

const program = new Command();

program
  .name('post-root')
  .description('Read tree.json for week N and call setMerkleRoot on the distributor')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--confirm', 'must be passed to actually broadcast', false)
  .option('--in <dir>', 'snapshots directory', 'snapshots');

program.parse();

const opts = program.opts<{ week: number; confirm: boolean; in: string }>();

async function run() {
  try {
    const treeData = JSON.parse(
      await readFile(join(opts.in, `week-${opts.week}`, 'tree.json'), 'utf-8'),
    );

    const root = treeData.root as `0x${string}`;
    const cumulativeSupply = BigInt(treeData.cumulativeSupply ?? '0');

    const state = await readDistributorState();
    logger.info(
      {
        week: opts.week,
        root,
        cumulativeSupply: cumulativeSupply.toString(),
        currentRoot: state.merkleRoot,
        lastCumulativeSupply: state.lastRootCumulativeSupply.toString(),
        weeklyMintCap: state.weeklyMintCap.toString(),
      },
      'Current distributor state',
    );

    if (!opts.confirm) {
      logger.warn('DRY-RUN: pass --confirm to actually broadcast');
      process.exit(0);
    }

    const hash = await postMerkleRoot({
      root,
      cumulativeSupply,
      weekNumber: opts.week,
    });

    logger.info({ hash }, 'Transaction confirmed');
  } catch (error) {
    logger.error(error, 'Post-root failed');
    process.exit(1);
  }
}

run();
