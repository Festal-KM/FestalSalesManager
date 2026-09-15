import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const counts = {
    users: await prisma.user.count(),
    members: await prisma.member.count(),
    clients: await prisma.client.count(),
    sales: await prisma.salesEntry.count(),
    sequences: await prisma.numberSequence.count(),
  };
  console.log("Runtime pooled connection OK:", counts);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("DB check failed:", e);
  process.exit(1);
});
