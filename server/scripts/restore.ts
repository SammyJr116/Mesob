import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

const BACKUPS_DIR = path.resolve(process.cwd(), "backups");

export async function restoreBackup(targetFile?: string): Promise<void> {
  let backupFilePath = targetFile;

  if (!backupFilePath) {
    if (!fs.existsSync(BACKUPS_DIR)) {
      throw new Error(`Backups directory does not exist: ${BACKUPS_DIR}`);
    }
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith("mesob_backup_") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error(`No backup files found in ${BACKUPS_DIR}`);
    }
    backupFilePath = path.join(BACKUPS_DIR, files[0]);
  } else if (!path.isAbsolute(backupFilePath)) {
    backupFilePath = path.resolve(process.cwd(), backupFilePath);
  }

  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found at: ${backupFilePath}`);
  }

  console.log(`[Restore] Reading backup file: ${backupFilePath}...`);
  const rawData = fs.readFileSync(backupFilePath, "utf-8");
  const parsed = JSON.parse(rawData);

  if (!parsed.entities || typeof parsed.entities !== "object") {
    throw new Error("Invalid backup format: missing 'entities' object.");
  }

  const entities: Record<string, any[]> = parsed.entities;
  const meta = parsed._meta || {};
  console.log(`[Restore] Backup metadata: Created ${meta.timestamp || "unknown"}, Total models: ${meta.totalModels || Object.keys(entities).length}`);

  // Build map of DateTime fields by model from Prisma DMMF
  const dateTimeFieldsByModel: Record<string, string[]> = {};
  for (const model of Prisma.dmmf.datamodel.models) {
    dateTimeFieldsByModel[model.name] = model.fields
      .filter((f) => f.type === "DateTime")
      .map((f) => f.name);
  }

  // Pre-process dates
  for (const [modelName, records] of Object.entries(entities)) {
    if (!Array.isArray(records)) continue;
    const dateFields = dateTimeFieldsByModel[modelName] || [];
    for (const record of records) {
      for (const field of dateFields) {
        if (record[field] !== null && record[field] !== undefined) {
          record[field] = new Date(record[field]);
        }
      }
    }
  }

  console.log(`[Restore] Commencing atomic transaction restore...`);

  await prisma.$transaction(
    async (tx) => {
      // Temporarily disable foreign keys for bulk restoration
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");

      try {
        // 1. Wipe current tables
        console.log(`[Restore] Clearing existing records across all models...`);
        const modelNames = Object.keys(Prisma.ModelName);
        for (const modelName of modelNames) {
          const prop = modelName.charAt(0).toLowerCase() + modelName.slice(1);
          const delegate = (tx as any)[prop];
          if (delegate && typeof delegate.deleteMany === "function") {
            await delegate.deleteMany();
          }
        }

        // 2. Insert backed up records
        console.log(`[Restore] Inserting backed up records...`);
        let totalInserted = 0;
        for (const [modelName, records] of Object.entries(entities)) {
          if (!Array.isArray(records) || records.length === 0) continue;
          const prop = modelName.charAt(0).toLowerCase() + modelName.slice(1);
          const delegate = (tx as any)[prop];
          if (delegate && typeof delegate.createMany === "function") {
            const CHUNK_SIZE = 500;
            for (let i = 0; i < records.length; i += CHUNK_SIZE) {
              const chunk = records.slice(i, i + CHUNK_SIZE);
              await delegate.createMany({ data: chunk });
            }
            totalInserted += records.length;
            console.log(`  - Restored ${records.length} records into ${modelName}`);
          }
        }

        console.log(`[Restore] Successfully restored ${totalInserted} total records across models.`);
      } finally {
        // Always re-enable foreign key checks
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");
      }
    },
    {
      maxWait: 30000,
      timeout: 120000,
    }
  );

  console.log(`[Restore] Database restoration successfully completed from: ${path.basename(backupFilePath)}`);
}

// Run directly if invoked from CLI
if (process.argv[1] && (process.argv[1].endsWith("restore.ts") || process.argv[1].endsWith("restore.js"))) {
  const target = process.argv[2];
  restoreBackup(target)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Restore] Failed:", err);
      process.exit(1);
    });
}
