import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: { employee: true },
  });

  for (const u of users) {
    const isMesob1234 = await bcrypt.compare("mesob1234", u.passwordHash);
    console.log(`User: ${u.username} | Role: ${u.role} | Status: ${u.status} | FailedAttempts: ${u.failedAttempts} | LockedUntil: ${u.lockedUntil} | ValidPassword: ${isMesob1234}`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
