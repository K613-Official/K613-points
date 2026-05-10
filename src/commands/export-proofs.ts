import '../cli-setup.js';
import { Command } from 'commander';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('export-proofs')
  .description('Dump per-user proof JSON files to snapshots/week-N/proofs/')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10));

program.parse();

const opts = program.opts<{ week: number }>();

logger.info({ week: opts.week }, 'TODO: export-proofs command not implemented');
process.exit(0);
