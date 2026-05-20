import '../cli-setup.js';
import { Command } from 'commander';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { logger } from '../util/logger.js';

const program = new Command();

program
  .name('export-proofs')
  .description('Dump per-user proof JSON files to snapshots/week-N/proofs/')
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--in <dir>', 'snapshots directory', 'snapshots');

program.parse();

const opts = program.opts<{ week: number; in: string }>();

async function run() {
  try {
    const treeData = JSON.parse(
      await readFile(join(opts.in, `week-${opts.week}`, 'tree.json'), 'utf-8'),
    );

    const tree = StandardMerkleTree.load(treeData.tree);
    const proofsDir = join(opts.in, `week-${opts.week}`, 'proofs');
    await mkdir(proofsDir, { recursive: true });

    let count = 0;
    for (const [i, leaf] of tree.entries()) {
      const [address, amount] = leaf;
      const proof = tree.getProof(i);

      const proofData = {
        address,
        amount: amount.toString(),
        proof,
        root: tree.root,
      };

      const filename = `${address.toLowerCase().slice(2)}.json`;
      await writeFile(join(proofsDir, filename), JSON.stringify(proofData, null, 2));
      count++;
    }

    logger.info({ path: proofsDir, proofs: count }, 'Proofs exported');
  } catch (error) {
    logger.error(error, 'Export proofs failed');
    process.exit(1);
  }
}

run();
