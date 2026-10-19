import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function resetDemoPasswords() {
  const hash = await bcrypt.hash("mesob1234", 10);
  const usernames = ["owner", "admin1", "chef", "selam", "dawit", "yonas", "tigist", "robel"];

  console.log("[Auth] Resetting demo account passwords to 'mesob1234'...");
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
    console.log(` - ${username}: reset ${updated.count} record(s)`);
  }
}

if (process.argv[1]?.includes("reset-passwords")) {
  resetDemoPasswords()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
