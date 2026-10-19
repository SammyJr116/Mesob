import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetPasswords() {
  const hash = await bcrypt.hash("mesob1234", 10);
  const usernames = ["owner", "admin1", "chef", "selam", "dawit", "yonas", "tigist", "robel"];

  for (const username of usernames) {
    const updated = await prisma.user.updateMany({
      where: { username },
      data: {
        passwordHash: hash,
        failedAttempts: 0,
        lockedUntil: null,
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });
    console.log(`Reset ${username}: updated ${updated.count} record(s)`);
  }
}

resetPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
