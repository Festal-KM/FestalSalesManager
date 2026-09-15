import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

// SSL は接続文字列の sslmode で制御する（lib/prisma.ts と同じ方針）。
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type RoleLit = "Admin" | "User";

/**
 * 必須の環境変数を取り出す。未設定なら停止する。
 * 初期パスワードをソースに書かないため、既定値は意図的に用意しない。
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `${name} が未設定です。\n` +
        `初期パスワードをソースコードに書かないため、環境変数を必須にしています。\n` +
        `  生成例: node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`,
    );
  }
  return v;
}

/**
 * 既存ユーザーのパスワードを毎回上書きすると、アプリ側で変更した値が
 * seed 再実行のたびに巻き戻ってしまう。そのため上書きは明示的なオプトインに限る。
 */
const FORCE_PW_RESET = process.env.SEED_FORCE_PASSWORD_RESET === "true";

async function upsertUser(loginId: string, plainPw: string, role: RoleLit) {
  const hash = await bcrypt.hash(plainPw, 10);
  const existing = await prisma.user.findUnique({
    where: { login_id: loginId },
    select: { id: true },
  });

  await prisma.user.upsert({
    where: { login_id: loginId },
    update: {
      role,
      is_active: true,
      // パスワードは SEED_FORCE_PASSWORD_RESET=true のときだけ更新する
      ...(FORCE_PW_RESET ? { login_pw: hash } : {}),
    },
    create: { login_id: loginId, login_pw: hash, role, is_active: true },
  });

  if (!existing) {
    console.log(`${role} created  -> login_id: ${loginId}（パスワードは環境変数の値）`);
  } else if (FORCE_PW_RESET) {
    console.log(`${role} updated  -> login_id: ${loginId}（パスワードを再設定しました）`);
  } else {
    console.log(
      `${role} exists   -> login_id: ${loginId}（パスワードは変更していません。` +
        `変更するには SEED_FORCE_PASSWORD_RESET=true を付けて再実行）`,
    );
  }
}

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
  await upsertUser(
    process.env.SEED_ADMIN_LOGIN_ID ?? "admin",
    requireEnv("SEED_ADMIN_PASSWORD"),
    "Admin",
  );

  // ===== 動作確認用の一般ユーザー（role=User）=====
  // 本番では不要なため、SEED_USER_PASSWORD が未設定なら作成しない。
  const userPw = process.env.SEED_USER_PASSWORD;
  if (userPw && userPw.trim() !== "") {
    await upsertUser(process.env.SEED_USER_LOGIN_ID ?? "user1", userPw, "User");
  } else {
    console.log("User skipped  -> SEED_USER_PASSWORD 未設定のため一般ユーザーは作成しません");
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
