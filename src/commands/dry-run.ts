import '../cli-setup.js';
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('dry-run')
  .description('snapshot + build-tree + print payload (no tx)')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10));

program.parse();

const opts = program.opts<{ week: number }>();

async function run() {
  try {
    logger.info({ week: opts.week }, 'Starting dry-run');

    const snapshotsDir = 'snapshots';
    const treeData = JSON.parse(
      await readFile(join(snapshotsDir, `week-${opts.week}`, 'tree.json'), 'utf-8'),
    );

    logger.info(
      {
        root: treeData.root,
        leaves: treeData.leaves,
        weekNumber: opts.week,
      },
      'Merkle root ready to post',
    );
  } catch (error) {
    logger.error(error, 'Dry-run failed');
    process.exit(1);
  }
}

run();
