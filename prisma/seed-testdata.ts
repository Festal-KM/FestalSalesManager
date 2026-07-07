import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// ---- 日付/キー生成（lib のロジックをエイリアス無しでインライン化） ----
function monthStartUTC(y: number, m: number): Date {
  return new Date(Date.UTC(y, m - 1, 1)); // m: 1..12
}
function yyyymm(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function derive(d: Date): { year: number; half: number; month: number } {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const half = month <= 6 ? 1 : 2; // 既存の暦ベース half 定義に合わせる
  return { year, half, month };
}
function salesKey(mc: string, cc: string, d: Date, status: string): string {
  return `${mc}_${cc}_${yyyymm(d)}_${status}`;
}

type Emp = "Proper" | "Outsource";
type Gen = "Male" | "Female";

const MEMBER_DEFS: {
  name: string;
  employment_type: Emp;
  gender: Gen;
  age: number;
  base: number;
}[] = [
  { name: "佐藤 健一", employment_type: "Proper", gender: "Male", age: 34, base: 2_200_000 },
  { name: "鈴木 美咲", employment_type: "Proper", gender: "Female", age: 29, base: 1_800_000 },
  { name: "高橋 大輔", employment_type: "Proper", gender: "Male", age: 41, base: 2_600_000 },
  { name: "田中 由美", employment_type: "Proper", gender: "Female", age: 36, base: 1_500_000 },
  { name: "伊藤 翔太", employment_type: "Proper", gender: "Male", age: 27, base: 1_200_000 },
  { name: "渡辺 彩香", employment_type: "Proper", gender: "Female", age: 33, base: 2_000_000 },
  { name: "山本 直樹", employment_type: "Outsource", gender: "Male", age: 45, base: 900_000 },
  { name: "中村 花子", employment_type: "Outsource", gender: "Female", age: 38, base: 700_000 },
];

// 案件期間として 2025/08〜2027/03 の20ヶ月分を用意（グラフ＆FY2026を埋める）。
// 予実は運用ルールに合わせ「前月以前＝実績・当月以降＝見込み」で自動判定する。
const ALL_MONTHS: [number, number][] = [
  [2025, 8], [2025, 9], [2025, 10], [2025, 11], [2025, 12],
  [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5], [2026, 6], [2026, 7],
  [2026, 8], [2026, 9], [2026, 10], [2026, 11], [2026, 12],
  [2027, 1], [2027, 2], [2027, 3],
];

// 月・メンバーで決定的に変動させる（0.75〜1.25倍、1万円単位に丸め）
function amountFor(base: number, memberIdx: number, monthSeq: number): number {
  const factor = 0.75 + 0.5 * (((monthSeq * 3 + memberIdx * 5) % 11) / 10);
  return Math.round((base * factor) / 10_000) * 10_000;
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { login_id: "admin" },
    select: { id: true },
  });
  if (!admin) throw new Error("admin ユーザーが見つかりません。先に db:seed を実行してください。");

  // ---- 取引先を1件確保 ----
  let client = await prisma.client.findFirst({
    where: { is_active: true },
    select: { id: true, client_code: true },
  });
  if (!client) {
    const seq = await prisma.numberSequence.update({
      where: { seq_key: "CLIENT" },
      data: { current_no: { increment: 1 } },
    });
    const code = `${seq.prefix}${String(seq.current_no).padStart(seq.pad_digits, "0")}`;
    client = await prisma.client.create({
      data: { client_code: code, company_name: "テスト商事株式会社", is_active: true },
      select: { id: true, client_code: true },
    });
    console.log("created client:", code);
  }

  // ---- メンバーを用意（同名が無いものだけ作成） ----
  const names = MEMBER_DEFS.map((m) => m.name);
  const existing = await prisma.member.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, member_code: true },
  });
  const existingNames = new Set(existing.map((m) => m.name));
  const toCreate = MEMBER_DEFS.filter((m) => !existingNames.has(m.name));

  if (toCreate.length > 0) {
    const seq = await prisma.numberSequence.findUniqueOrThrow({ where: { seq_key: "MEMBER" } });
    let no = seq.current_no;
    const rows = toCreate.map((m) => {
      no += 1;
      return {
        member_code: `${seq.prefix}${String(no).padStart(seq.pad_digits, "0")}`,
        name: m.name,
        age: m.age,
        gender: m.gender,
        employment_type: m.employment_type,
        is_active: true,
      };
    });
    await prisma.member.createMany({ data: rows, skipDuplicates: true });
    await prisma.numberSequence.update({
      where: { seq_key: "MEMBER" },
      data: { current_no: no },
    });
    console.log(`created ${rows.length} members:`, rows.map((r) => r.member_code).join(", "));
  } else {
    console.log("members already exist, reusing.");
  }

  // 作成後の全メンバー（コード付き）を取得
  const members = await prisma.member.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, member_code: true },
  });
  const memberByName = new Map(members.map((m) => [m.name, m]));

  // ---- 売上を一括生成 ----
  const salesRows: {
    sales_key: string;
    period_month: Date;
    amount: number;
    status: "Actual" | "Forecast";
    memo: string | null;
    year: number;
    half: number;
    month: number;
    member_id: string;
    client_id: string;
    created_by_id: string;
    updated_by_id: string;
    is_deleted: boolean;
  }[] = [];

  // 当月1日(UTC)。これより前の月＝実績、当月以降＝見込み。
  const nowD = new Date();
  const cutoff = Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth(), 1);

  MEMBER_DEFS.forEach((def, memberIdx) => {
    const m = memberByName.get(def.name);
    if (!m) return;
    ALL_MONTHS.forEach(([y, mm], i) => {
      const d = monthStartUTC(y, mm);
      const status: "Actual" | "Forecast" =
        d.getTime() < cutoff ? "Actual" : "Forecast";
      const { year, half, month } = derive(d);
      salesRows.push({
        sales_key: salesKey(m.member_code, client!.client_code, d, status),
        period_month: d,
        amount: amountFor(def.base, memberIdx, i),
        status,
        memo: null,
        year,
        half,
        month,
        member_id: m.id,
        client_id: client!.id,
        created_by_id: admin.id,
        updated_by_id: admin.id,
        is_deleted: false,
      });
    });
  });

  const res = await prisma.salesEntry.createMany({ data: salesRows, skipDuplicates: true });
  console.log(`sales rows prepared: ${salesRows.length}, inserted (new): ${res.count}`);
  console.log("DONE");
}

main()
  .catch((e) => {
    console.error("seed-testdata failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
