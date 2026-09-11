/**
 * Creates or updates an application user.
 *   npm run users:create -- --email viglesias@letocapital.com.br --name "Vitória Iglesias" --password "..." [--role ADMIN|USER]
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { initialsOf } from "../src/lib/normalization/text";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const name = arg("name");
  const password = arg("password") ?? process.env.SEED_DEFAULT_PASSWORD;
  const role = (arg("role") ?? "USER").toUpperCase() as "ADMIN" | "USER";
  if (!email || !password) {
    console.error("Usage: npm run users:create -- --email <email> --name <name> --password <password> [--role ADMIN|USER]");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, ...(name ? { name, initials: initialsOf(name) } : {}), role, isActive: true, isArchived: false },
    create: { email: email.toLowerCase(), name: name ?? email, initials: initialsOf(name ?? email), passwordHash, role },
  });
  console.log(`User ready: ${user.name} <${user.email}> [${user.role}]`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
