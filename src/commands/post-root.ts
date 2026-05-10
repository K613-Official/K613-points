import '../cli-setup.js';
import { Command } from 'commander';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('post-root')
  .description('Read tx-payload for week N and call setMerkleRoot on the distributor')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--confirm', 'must be passed to actually broadcast', false);

program.parse();

const opts = program.opts<{ week: number; confirm: boolean }>();

logger.info(
  { week: opts.week, confirm: opts.confirm },
  'TODO: post-root command not implemented',
);
process.exit(0);
