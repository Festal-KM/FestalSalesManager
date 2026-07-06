"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser, requireAdmin } from "@/lib/auth-helpers";
import { normalizeToMonthStart, deriveYearHalfMonth } from "@/lib/date";
import { buildSalesKey } from "@/lib/sales-key";

type StatusLit = "Actual" | "Forecast";

export type SalesFormState = { error?: string };

type ParsedInput = {
  member_id: string;
  client_id: string;
  periodMonthRaw: string;
  amountRaw: string;
  status: string;
  memo: string;
};

function parse(formData: FormData): ParsedInput {
  return {
    member_id: String(formData.get("member_id") ?? "").trim(),
    client_id: String(formData.get("client_id") ?? "").trim(),
    periodMonthRaw: String(formData.get("period_month") ?? "").trim(),
    amountRaw: String(formData.get("amount") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    memo: String(formData.get("memo") ?? "").trim(),
  };
}

/** 共通バリデーション（要件17-6 / 18-8） */
function validate(i: ParsedInput): string | null {
  if (!i.member_id || !i.client_id || !i.periodMonthRaw || !i.status) {
    return "必須項目を入力してください";
  }
  if (i.status !== "Actual" && i.status !== "Forecast") {
    return "必須項目を入力してください";
  }
  if (i.amountRaw === "") return "必須項目を入力してください";
  const amount = Number(i.amountRaw);
  if (!Number.isFinite(amount) || amount < 0) {
    return "売上金額は0以上で入力してください";
  }
  return null;
}

/** S21 売上登録（sales_key一致で既存があれば更新=upsert）要件17 */
export async function createSales(
  _prev: SalesFormState,
  formData: FormData,
): Promise<SalesFormState> {
  const user = await requireUser();
  const i = parse(formData);
  const err = validate(i);
  if (err) return { error: err };

  const [member, client] = await Promise.all([
    prisma.member.findUnique({ where: { id: i.member_id } }),
    prisma.client.findUnique({ where: { id: i.client_id } }),
  ]);
  if (!member || !client) return { error: "入力内容を確認してください" };

  const monthStart = normalizeToMonthStart(i.periodMonthRaw);
  const { year, half, month } = deriveYearHalfMonth(monthStart);
  const sales_key = buildSalesKey({
    memberCode: member.member_code,
    clientCode: client.client_code,
    monthStart,
    status: i.status,
  });

  const existing = await prisma.salesEntry.findFirst({
    where: { sales_key, is_deleted: false },
    select: { id: true },
  });

  const common = {
    member_id: i.member_id,
    client_id: i.client_id,
    period_month: monthStart,
    amount: i.amountRaw,
    status: i.status as StatusLit,
    memo: i.memo || null,
    year,
    half,
    month,
  };

  if (existing) {
    // 要件17-7 既存更新
    await prisma.salesEntry.update({
      where: { id: existing.id },
      data: { ...common, sales_key, updated_by_id: user.id },
    });
  } else {
    // 新規作成
    await prisma.salesEntry.create({
      data: {
        ...common,
        sales_key,
        created_by_id: user.id,
        updated_by_id: user.id,
        is_deleted: false,
      },
    });
  }

  revalidatePath("/sales");
  redirect("/sales");
}

/** S22 売上編集 要件18 */
export async function updateSales(
  _prev: SalesFormState,
  formData: FormData,
): Promise<SalesFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "入力内容を確認してください" };

  const target = await prisma.salesEntry.findUnique({ where: { id } });
  if (!target || target.is_deleted) return { error: "対象の売上が見つかりません" };

  // User は自分（linked_member）の売上のみ編集可
  if (user.role !== "Admin") {
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { linked_member: { select: { id: true } } },
    });
    if (!me?.linked_member || me.linked_member.id !== target.member_id) {
      return { error: "権限がありません" };
    }
  }

  const i = parse(formData);
  const err = validate(i);
  if (err) return { error: err };

  const [member, client] = await Promise.all([
    prisma.member.findUnique({ where: { id: i.member_id } }),
    prisma.client.findUnique({ where: { id: i.client_id } }),
  ]);
  if (!member || !client) return { error: "入力内容を確認してください" };

  const monthStart = normalizeToMonthStart(i.periodMonthRaw);
  const { year, half, month } = deriveYearHalfMonth(monthStart);
  const sales_key = buildSalesKey({
    memberCode: member.member_code,
    clientCode: client.client_code,
    monthStart,
    status: i.status,
  });

  // 要件18-7 自分以外に同一 sales_key があれば重複エラー
  const dup = await prisma.salesEntry.findFirst({
    where: { sales_key, is_deleted: false, NOT: { id } },
    select: { id: true },
  });
  if (dup) return { error: "同一条件の売上が既に存在します（重複）" };

  await prisma.salesEntry.update({
    where: { id },
    data: {
      member_id: i.member_id,
      client_id: i.client_id,
      period_month: monthStart,
      amount: i.amountRaw,
      status: i.status as StatusLit,
      memo: i.memo || null,
      year,
      half,
      month,
      sales_key,
      updated_by_id: user.id,
    },
  });

  revalidatePath("/sales");
  redirect("/sales");
}

/** S22 論理削除（要件18-9 / 27）Admin専用 */
export async function deleteSales(formData: FormData): Promise<void> {
  const admin = await requireAdmin("/sales");
  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    await prisma.salesEntry.update({
      where: { id },
      data: { is_deleted: true, updated_by_id: admin.id },
    });
  }
  revalidatePath("/sales");
  redirect("/sales");
}
