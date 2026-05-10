import '../cli-setup.js';
import { Command } from 'commander';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('dry-run')
  .description('snapshot + build-tree + print payload (no tx)')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10));

program.parse();

const opts = program.opts<{ week: number }>();

logger.info({ week: opts.week }, 'TODO: dry-run command not implemented');
process.exit(0);
