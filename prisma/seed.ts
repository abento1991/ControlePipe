import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedReferenceData } from "../src/lib/seed-reference";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_DEFAULT_PASSWORD;
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  await seedReferenceData(prisma, { passwordHash });
  const users = await prisma.user.findMany({ where: { isArchived: false }, select: { name: true, email: true, role: true, passwordHash: true } });
  console.log("Seeded reference data. Users:");
  for (const u of users) console.log(`  - ${u.name} <${u.email}> [${u.role}] ${u.passwordHash ? "(password set)" : "(no password — run npm run users:create)"}`);
  if (!password) console.log("SEED_DEFAULT_PASSWORD not set: users were created without a password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
