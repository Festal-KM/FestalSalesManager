import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// Supabase のトランザクションプーラ(6543)経由で接続する。
// pg アダプタが解釈しない pgbouncer パラメータは無視されるが、SSL は明示しておく。
const connectionString = process.env.DATABASE_URL;

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString,
    // Supabase pooler は SSL 必須。自己署名を許容。
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
