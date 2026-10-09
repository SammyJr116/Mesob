import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

const BACKUPS_DIR = path.resolve(process.cwd(), "backups");

export async function createBackup(): Promise<string> {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `mesob_backup_${timestamp}.json`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  console.log(`[Backup] Starting full database backup to ${backupFileName}...`);

  const entities: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  const modelNames = Object.keys(Prisma.ModelName);
  for (const modelName of modelNames) {
    const prop = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const delegate = (prisma as any)[prop];
    if (delegate && typeof delegate.findMany === "function") {
      const records = await delegate.findMany();
      entities[modelName] = records;
      counts[modelName] = records.length;
    }
  }

  const data = {
    _meta: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      restaurant: "Mesob Ethiopian Restaurant",
      totalModels: Object.keys(entities).length,
      counts,
    },
    entities,
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(data, null, 2), "utf-8");
  const stat = fs.statSync(backupFilePath);
  console.log(`[Backup] Full backup completed successfully!`);
  console.log(`[Backup] Saved to: ${backupFilePath} (${(stat.size / 1024).toFixed(2)} KB)`);
  console.log(`[Backup] Models backed up: ${Object.keys(entities).length}`);

  // Enforce 30-day retention cleanup (PRD 23.6.1)
  cleanOldBackups(30);

  return backupFilePath;
}

function cleanOldBackups(retentionDays = 30) {
  if (!fs.existsSync(BACKUPS_DIR)) return;
  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(BACKUPS_DIR);
  for (const file of files) {
    if (file.startsWith("mesob_backup_") && file.endsWith(".json")) {
      const filePath = path.join(BACKUPS_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`[Backup Retention] Purged backup older than 30 days: ${file}`);
      }
    }
  }
}

// Run directly if invoked from CLI
if (process.argv[1] && (process.argv[1].endsWith("backup.ts") || process.argv[1].endsWith("backup.js"))) {
  createBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Backup] Failed:", err);
      process.exit(1);
    });
}
