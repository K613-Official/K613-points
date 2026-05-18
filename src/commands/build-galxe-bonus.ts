import '../cli-setup.js';
import { Command } from 'commander';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { logger } from '../util/logger.js';
import { cleanEnv } from '../config/env.js';
import { weightFor } from '../config/galxe-weights.js';
import { createGalxeClient } from '../galxe/client.js';
import {
  computeGalxeBonus,
  parseCreditedState,
  serializeCreditedState,
  toBonusFileJSON,
} from '../galxe/bonus.js';

const program = new Command();

program
  .name('build-galxe-bonus')
  .description(
    'Pull Galxe space participants and emit inputs/galxe-week-N.json (feeds apply-bonuses)',
  )
  .requiredOption('--week <n>', 'week number (1-indexed)', (v) => Number.parseInt(v, 10))
  .option('--out <dir>', 'inputs directory', 'inputs')
  .option('--state <path>', 'cumulative credited-state file', 'inputs/galxe-credited.json');

program.parse();

const opts = program.opts<{ week: number; out: string; state: string }>();

async function run() {
  try {
    const env = cleanEnv();
    if (!env.GALXE_ACCESS_TOKEN) {
      throw new Error('GALXE_ACCESS_TOKEN is required in .env for build-galxe-bonus');
    }

    const client = createGalxeClient({
      url: env.GALXE_API_URL,
      accessToken: env.GALXE_ACCESS_TOKEN,
    });

    const explicit = env.GALXE_CAMPAIGN_IDS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const campaignIds =
      explicit.length > 0 ? explicit : await client.listCampaignIds(env.GALXE_SPACE_ID);
    logger.info(
      {
        spaceId: env.GALXE_SPACE_ID,
        campaigns: campaignIds.length,
        source: explicit.length > 0 ? 'GALXE_CAMPAIGN_IDS' : 'space.campaigns',
      },
      'Fetched campaigns',
    );

    // Sequential by design: avoids Galxe rate-limit/WAF under parallel load
    // and gives a clear per-campaign error if one fails.
    const participantsByCampaign: { campaignId: string; addresses: string[] }[] = [];
    for (const campaignId of campaignIds) {
      // eslint-disable-next-line no-await-in-loop
      const addresses = await client.listParticipantAddresses(campaignId);
      participantsByCampaign.push({ campaignId, addresses });
    }

    let priorState;
    try {
      priorState = parseCreditedState(JSON.parse(await readFile(opts.state, 'utf-8')));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Cannot read state ${opts.state}: ${(err as Error).message}`);
      }
      priorState = parseCreditedState({ spaceId: env.GALXE_SPACE_ID, credited: {} });
    }

    const { bonusList, credited } = computeGalxeBonus({
      weekNumber: opts.week,
      participantsByCampaign,
      priorCredited: priorState.credited,
      weightFor,
    });

    const bonusPath = join(opts.out, `galxe-week-${opts.week}.json`);
    await mkdir(dirname(bonusPath), { recursive: true });
    await writeFile(bonusPath, JSON.stringify(toBonusFileJSON(bonusList), null, 2));

    await mkdir(dirname(opts.state), { recursive: true });
    await writeFile(
      opts.state,
      JSON.stringify(serializeCreditedState({ spaceId: env.GALXE_SPACE_ID, credited }), null, 2),
    );

    const totalDelta = bonusList.bonuses.reduce((acc, b) => acc + b.amount, 0n);
    logger.info(
      {
        bonusPath,
        statePath: opts.state,
        week: opts.week,
        rows: bonusList.bonuses.length,
        totalDelta: totalDelta.toString(),
      },
      `Galxe bonus written — run: apply-bonuses --week ${opts.week} --file ${bonusPath}`,
    );
  } catch (error) {
    logger.error(error, 'Build Galxe bonus failed');
    process.exit(1);
  }
}

run();
