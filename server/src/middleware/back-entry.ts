import { prisma } from "../lib/prisma.js";
import { Role } from "@prisma/client";

export class BackEntryError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = "BackEntryError";
  }
}

/**
 * Validates whether an event timestamp (happenedAt) is allowed for back-entry (PRD 4.5)
 */
export async function validateBackEntry(
  userId: string,
  userRole: Role,
  happenedAt: Date,
  enteredAt: Date = new Date(),
  actionDescription: string = "Operational event"
) {
  const diffMs = enteredAt.getTime() - happenedAt.getTime();
  // If happenedAt is in the past by more than 5 minutes, it is considered a back-entry
  const isBackEntry = diffMs > 5 * 60 * 1000;

  if (!isBackEntry) {
    return { allowed: true, isBackEntry: false };
  }

  // 1. Permission check (PRD 4.5.2)
  if (userRole !== Role.MANAGER) {
    const now = new Date();
    const activeGrant = await prisma.backEntryGrant.findFirst({
      where: {
        userId,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });

    if (!activeGrant) {
      throw new BackEntryError(
        "Back-entry permission required to submit events with a past timestamp (PRD 4.5.2). Contact a Manager for temporary back-entry authorization.",
        403
      );
    }
  }

  // 2. Closed business day check (PRD 4.5.3)
  const happenedDateStr = happenedAt.toISOString().slice(0, 10);
  const closure = await prisma.dayClosure.findUnique({
    where: { businessDate: happenedDateStr },
  });

  if (closure && !closure.reopenedAt) {
    throw new BackEntryError(
      `Cannot back-enter record into closed business day ${happenedDateStr}. Day must be reopened by Manager first (PRD 4.5.3).`,
      400
    );
  }

  // 3. Log back-entry usage to ActivityLog (PRD 4.5.2)
  await prisma.activityLog.create({
    data: {
      userId,
      role: userRole,
      action: "BACK_ENTRY_USAGE",
      target: "BackEntry",
      oldValue: happenedAt.toISOString(),
      newValue: enteredAt.toISOString(),
      reason: `Back-entry used for: ${actionDescription}`,
    },
  });

  return { allowed: true, isBackEntry: true };
}
