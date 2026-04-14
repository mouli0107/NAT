import { db } from '../server/db';
import { frameworkConfigs, frameworkFiles } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { detectPattern, detectLanguage, detectTool } from '../server/framework-parser';

async function backfillDetection() {
  const configs = await db.select().from(frameworkConfigs);
  console.log(`Found ${configs.length} configs to check`);

  for (const config of configs) {
    const hasDetection =
      config.detectedLanguage &&
      config.detectedTool &&
      config.detectedPattern;

    if (hasDetection) {
      console.log(`${config.name}: already detected, skipping`);
      continue;
    }

    const files = await db.select()
      .from(frameworkFiles)
      .where(eq(frameworkFiles.configId, config.id));

    if (files.length === 0) {
      console.log(`${config.name}: no files, skipping`);
      continue;
    }

    const fileContents = files.map(f => ({
      filename: f.filename,
      content: f.content,
    }));

    const detectedPattern  = detectPattern(config.name, fileContents);
    const detectedLanguage = detectLanguage(fileContents);
    const detectedTool     = detectTool(fileContents);

    await db.update(frameworkConfigs)
      .set({
        detectedPattern,
        detectedLanguage,
        detectedTool,
        updatedAt: new Date(),
      })
      .where(eq(frameworkConfigs.id, config.id));

    console.log(
      `${config.name}: detected ${detectedLanguage} + ${detectedTool} + ${detectedPattern}`
    );
  }

  console.log('Backfill complete');
  process.exit(0);
}

backfillDetection().catch(console.error);
