import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // ===== NumberSequence 初期データ (要件 6-5) =====
  const sequences = [
    { seq_key: "MEMBER", prefix: "M-", pad_digits: 6 },
    { seq_key: "CLIENT", prefix: "C-", pad_digits: 6 },
    { seq_key: "LABEL", prefix: "L-", pad_digits: 3 },
  ];
  for (const s of sequences) {
    await prisma.numberSequence.upsert({
      where: { seq_key: s.seq_key },
      update: { prefix: s.prefix, pad_digits: s.pad_digits, is_active: true },
      create: { seq_key: s.seq_key, current_no: 0, prefix: s.prefix, pad_digits: s.pad_digits },
    });
  }
  console.log("NumberSequence seeded:", sequences.map((s) => s.seq_key).join(", "));

  // ===== 初期 Admin ユーザー =====
  const adminLoginId = "admin";
  const adminPlainPw = "Admin1234!";
  const adminHash = await bcrypt.hash(adminPlainPw, 10);
  await prisma.user.upsert({
    where: { login_id: adminLoginId },
    update: { role: "Admin", is_active: true },
    create: { login_id: adminLoginId, login_pw: adminHash, role: "Admin", is_active: true },
  });
  console.log(`Admin user ready -> login_id: ${adminLoginId} / password: ${adminPlainPw}`);

  // ===== 動作確認用の一般ユーザー（role=User） =====
  const userLoginId = "user1";
  const userPlainPw = "User1234!";
  const userHash = await bcrypt.hash(userPlainPw, 10);
  await prisma.user.upsert({
    where: { login_id: userLoginId },
    update: { role: "User", is_active: true },
    create: { login_id: userLoginId, login_pw: userHash, role: "User", is_active: true },
  });
  console.log(`User ready -> login_id: ${userLoginId} / password: ${userPlainPw}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
