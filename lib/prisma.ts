import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// 接続先(Railway / Supabase / ローカル)の差異は DATABASE_URL の sslmode で吸収する。
// アプリコードに特定ホスティングの前提を持ち込まない。
//   Railway 内部接続  : sslmode 指定なし（同一プライベート網・TLS なし）
//   Railway 外部接続  : ?sslmode=require
//   Supabase          : ?sslmode=no-verify （自己署名を許容 = 旧 rejectUnauthorized:false 相当）
const connectionString = process.env.DATABASE_URL;

function createPrismaClient() {
  // ssl は明示しない。node-postgres が接続文字列の sslmode を解釈する。
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
