import '../cli-setup.js';
import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../util/logger.js';
import { parsePointsFile, serializePointsFile, type PointsFile } from '../snapshot/points-file.js';
import { loadManualBonuses } from '../snapshot/manual-bonuses.js';
import { applyBonuses, assertBonusWeek } from '../snapshot/apply-bonuses.js';

const program = new Command();

program
  .name('apply-bonuses')
  .description(
    'Fold a manual/Galxe bonus list into snapshots/week-N/points.json (run before build-tree)',
  )
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .requiredOption('--file <path>', 'bonus list JSON (ManualBonusList schema)')
  .option('--in <dir>', 'snapshots directory', 'snapshots');

program.parse();

const opts = program.opts<{ week: number; file: string; in: string }>();

async function run() {
  try {
    const pointsPath = join(opts.in, `week-${opts.week}`, 'points.json');

    let pointsFile: PointsFile;
    try {
      pointsFile = parsePointsFile(JSON.parse(await readFile(pointsPath, 'utf-8')));
    } catch (err) {
      throw new Error(
        `Cannot read ${pointsPath} (run snapshot --week ${opts.week} first): ${(err as Error).message}`,
      );
    }

    const bonuses = await loadManualBonuses(opts.file);
    assertBonusWeek(bonuses, opts.week);

    const result = applyBonuses(pointsFile, bonuses);

    if (!result.applied) {
      logger.info(
        { file: opts.file, hash: result.hash },
        'Bonus list already applied — idempotent no-op, points.json unchanged',
      );
      return;
    }

    await writeFile(pointsPath, JSON.stringify(serializePointsFile(result.points), null, 2));

    logger.info(
      {
        path: pointsPath,
        file: opts.file,
        week: opts.week,
        bonuses: result.affected,
        hash: result.hash,
        users: result.points.userPoints.size,
      },
      'Bonuses applied to points.json',
    );
  } catch (error) {
    logger.error(error, 'Apply bonuses failed');
    process.exit(1);
  }
}

run();
