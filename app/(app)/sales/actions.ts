"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth-helpers";
import {
  normalizeToMonthStart,
  deriveYearHalfMonth,
  enumerateMonths,
  currentMonthStart,
} from "@/lib/date";
import { buildSalesKey } from "@/lib/sales-key";

type StatusLit = "Actual" | "Forecast";

export type SalesFormState = { error?: string };

// ===== 売上一覧の絞り込み =====
// 開始月・終了月は Cookie に記憶し、次回以降 URL 未指定でも復元する（要望）。
const SALES_FILTER_FIELDS = [
  "contract",
  "start_month",
  "end_month",
  "status",
  "employment",
  "member_id",
  "client_id",
  "keyword",
] as const;
const COOKIE_OPTS = { sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };
// 開始月・終了月の記憶は契約区分ごとに独立させる（区分間で連携させない）
function normContract(v: string): string {
  return v === "Contract" || v === "Other" ? v : "SemiDelegation";
}
function startCookie(contract: string): string {
  return `sales_start_month_${normContract(contract)}`;
}
function endCookie(contract: string): string {
  return `sales_end_month_${normContract(contract)}`;
}

/** 検索実行：開始月・終了月を（契約区分ごとに）記憶しつつ、条件を URL に載せて再表示 */
export async function applySalesFilter(formData: FormData): Promise<void> {
  await requireUser();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const contract = normContract(get("contract"));
  const start = get("start_month");
  const end = get("end_month");
  const jar = await cookies();
  if (start) jar.set(startCookie(contract), start, COOKIE_OPTS);
  else jar.delete(startCookie(contract));
  if (end) jar.set(endCookie(contract), end, COOKIE_OPTS);
  else jar.delete(endCookie(contract));

  const params = new URLSearchParams();
  for (const k of SALES_FILTER_FIELDS) {
    const v = get(k);
    if (v && v !== "all") params.set(k, v);
  }
  const qs = params.toString();
  redirect(qs ? `/sales?${qs}` : "/sales");
}

/** 条件クリア：その契約区分の記憶した開始月・終了月のみ消去 */
export async function clearSalesFilter(formData: FormData): Promise<void> {
  await requireUser();
  const contract = normContract(String(formData.get("contract") ?? ""));
  const jar = await cookies();
  jar.delete(startCookie(contract));
  jar.delete(endCookie(contract));
  redirect(`/sales?contract=${contract}`);
}

/** 一覧からワンタップで 見込み(Forecast) → 実績(Actual) に更新 */
export async function promoteSale(formData: FormData): Promise<void> {
  await requireAdmin("/my");
  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    const target = await prisma.salesEntry.findUnique({
      where: { id },
      select: {
        is_deleted: true,
        status: true,
        period_month: true,
        member: { select: { member_code: true } },
        client: { select: { client_code: true } },
      },
    });
    if (target && !target.is_deleted && target.status === "Forecast") {
      const newKey = buildSalesKey({
        memberCode: target.member.member_code,
        clientCode: target.client.client_code,
        monthStart: target.period_month,
        status: "Actual",
      });
      // 既に同一の実績キーがある場合は二重計上を避けて見込みを論理削除
      const taken = await prisma.salesEntry.findUnique({
        where: { sales_key: newKey },
        select: { id: true },
      });
      if (taken) {
        await prisma.salesEntry.update({ where: { id }, data: { is_deleted: true } });
      } else {
        await prisma.salesEntry.update({
          where: { id },
          data: { status: "Actual", sales_key: newKey },
        });
      }
    }
  }
  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

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

type ExpenseLit = "Transportation" | "Reimbursement" | "Other";
type ParsedExpense = { type: ExpenseLit; amount: string; note: string | null };

/**
 * 計上経費（任意・複数可）の取得＋検証。
 * フォームは hidden の "expenses"（JSON配列 [{type, amount, note}]）で送る。
 * 各行: 区分必須・経費額は0以上・「その他」は備考必須。区分空の行は無視。
 */
function parseExpenses(
  formData: FormData,
): { expenses: ParsedExpense[] } | { error: string } {
  const raw = String(formData.get("expenses") ?? "").trim();
  if (!raw) return { expenses: [] };

  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return { error: "経費データの形式が不正です" };
  }
  if (!Array.isArray(arr)) return { error: "経費データの形式が不正です" };

  const out: ParsedExpense[] = [];
  for (const item of arr) {
    const o = (item ?? {}) as { type?: string; amount?: string; note?: string };
    const type = (o.type ?? "").trim();
    if (!type) continue; // 未入力行はスキップ
    if (type !== "Transportation" && type !== "Reimbursement" && type !== "Other") {
      return { error: "経費区分が不正です" };
    }
    const amountRaw = (o.amount ?? "").toString().trim();
    if (amountRaw === "") return { error: "経費額を入力してください" };
    const amt = Number(amountRaw);
    if (!Number.isFinite(amt) || amt < 0) {
      return { error: "経費額は0以上で入力してください" };
    }
    const note = (o.note ?? "").trim();
    if (type === "Other" && !note) {
      return { error: "「その他」の場合は備考を入力してください" };
    }
    out.push({ type, amount: amountRaw, note: type === "Other" ? note : null });
  }
  return { expenses: out };
}

type ContractLit = "SemiDelegation" | "Contract" | "Other";

/** 契約区分（不正・未指定は準委任にフォールバック） */
function parseContract(formData: FormData): ContractLit {
  const v = String(formData.get("contract") ?? "").trim();
  return v === "Contract" || v === "Other" ? v : "SemiDelegation";
}

/** 仕入単価（外注コスト）。空なら null、負数はエラー。 */
function parsePurchaseCost(
  formData: FormData,
): { value: string | null } | { error: string } {
  const raw = String(formData.get("purchase_cost") ?? "").trim();
  if (raw === "") return { value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { error: "仕入単価は0以上で入力してください" };
  }
  return { value: raw };
}

// $transaction コールバックの引数型（tx クライアント）
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** 指定売上の経費を全置換する（tx 内で使用） */
async function replaceExpenses(
  tx: TxClient,
  salesEntryId: string,
  expenses: ParsedExpense[],
): Promise<void> {
  await tx.expense.deleteMany({ where: { sales_entry_id: salesEntryId } });
  if (expenses.length > 0) {
    await tx.expense.createMany({
      data: expenses.map((e) => ({
        sales_entry_id: salesEntryId,
        type: e.type,
        amount: e.amount,
        note: e.note,
      })),
    });
  }
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
  const exp = parseExpenses(formData);
  if ("error" in exp) return { error: exp.error };

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

  await prisma.$transaction(async (tx) => {
    const existing = await tx.salesEntry.findFirst({
      where: { sales_key, is_deleted: false },
      select: { id: true },
    });
    let entryId: string;
    if (existing) {
      await tx.salesEntry.update({
        where: { id: existing.id },
        data: { ...common, sales_key, updated_by_id: user.id },
      });
      entryId = existing.id;
    } else {
      const created = await tx.salesEntry.create({
        data: {
          ...common,
          sales_key,
          created_by_id: user.id,
          updated_by_id: user.id,
          is_deleted: false,
        },
        select: { id: true },
      });
      entryId = created.id;
    }
    await replaceExpenses(tx, entryId, exp.expenses);
  });

  revalidatePath("/sales");
  redirect("/sales");
}

/**
 * 案件の期間一括登録。
 * 月額固定 × [開始月, 終了月] の各月に1件ずつ売上を作成/更新する。
 * 予実区分は「前月以前＝実績・当月以降＝見込み」で自動判定。
 * 同一(メンバー×取引先×対象月×区分)は sales_key で upsert（論理削除済みは復活）。
 */
export async function createSalesBulk(
  _prev: SalesFormState,
  formData: FormData,
): Promise<SalesFormState> {
  const user = await requireUser();

  const member_id = String(formData.get("member_id") ?? "").trim();
  const client_id = String(formData.get("client_id") ?? "").trim();
  const startRaw = String(formData.get("start_month") ?? "").trim();
  const endRaw = String(formData.get("end_month") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const contract_type = parseContract(formData);

  if (!member_id || !client_id || !startRaw || !endRaw || amountRaw === "") {
    return { error: "必須項目を入力してください" };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "月額は0以上で入力してください" };
  }
  const exp = parseExpenses(formData);
  if ("error" in exp) return { error: exp.error };
  const purchaseCost = parsePurchaseCost(formData);
  if ("error" in purchaseCost) return { error: purchaseCost.error };

  const start = normalizeToMonthStart(startRaw);
  const end = normalizeToMonthStart(endRaw);
  if (end.getTime() < start.getTime()) {
    return { error: "終了月は開始月以降にしてください" };
  }
  const months = enumerateMonths(start, end);
  if (months.length > 36) {
    return { error: "登録できる期間は36ヶ月以内です" };
  }

  const [member, client] = await Promise.all([
    prisma.member.findUnique({ where: { id: member_id } }),
    prisma.client.findUnique({ where: { id: client_id } }),
  ]);
  if (!member || !client) return { error: "入力内容を確認してください" };

  const cutoff = currentMonthStart();

  await prisma.$transaction(async (tx) => {
    for (const m of months) {
      // 前月以前＝実績 / 当月以降＝見込み
      const status: StatusLit = m.getTime() < cutoff.getTime() ? "Actual" : "Forecast";

      // 同一(メンバー×取引先×対象月)の既存（非削除）行。区分違いの重複＝二重計上を防ぐ。
      const siblings = await tx.salesEntry.findMany({
        where: { member_id, client_id, period_month: m, is_deleted: false },
        select: { id: true, status: true, sales_key: true },
      });

      // 見込みで登録しようとした月に既に実績がある場合は、実績を優先してスキップ
      // （既存の確定実績を見込みへ降格させない）。
      if (status === "Forecast" && siblings.some((s) => s.status === "Actual")) {
        continue;
      }

      const { year, half, month } = deriveYearHalfMonth(m);
      const sales_key = buildSalesKey({
        memberCode: member.member_code,
        clientCode: client.client_code,
        monthStart: m,
        status,
      });
      const data = {
        member_id,
        client_id,
        period_month: m,
        amount: amountRaw,
        status,
        contract_type,
        memo: memo || null,
        year,
        half,
        month,
        sales_key,
        is_deleted: false,
        purchase_cost: purchaseCost.value,
      };
      // sales_key は一意（論理削除行も含む）。存在すれば更新（＝復活）、無ければ作成。
      const target = await tx.salesEntry.findUnique({
        where: { sales_key },
        select: { id: true },
      });
      let entryId: string;
      if (target) {
        await tx.salesEntry.update({
          where: { id: target.id },
          data: { ...data, updated_by_id: user.id },
        });
        entryId = target.id;
      } else {
        const created = await tx.salesEntry.create({
          data: { ...data, created_by_id: user.id, updated_by_id: user.id },
          select: { id: true },
        });
        entryId = created.id;
      }
      // 経費は各月に同じ内容で計上（月額経費・複数可）
      await replaceExpenses(tx, entryId, exp.expenses);

      // 目的キー以外の同月・非削除行（＝反対区分の重複）は論理削除して1件に収れんさせる
      for (const s of siblings) {
        if (s.sales_key !== sales_key) {
          await tx.salesEntry.update({
            where: { id: s.id },
            data: { is_deleted: true, updated_by_id: user.id },
          });
        }
      }
    }
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  redirect(`/sales?contract=${contract_type}`);
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
  const exp = parseExpenses(formData);
  if ("error" in exp) return { error: exp.error };

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

  const contract_type = parseContract(formData);
  const purchaseCost = parsePurchaseCost(formData);
  if ("error" in purchaseCost) return { error: purchaseCost.error };

  await prisma.$transaction(async (tx) => {
    await tx.salesEntry.update({
      where: { id },
      data: {
        member_id: i.member_id,
        client_id: i.client_id,
        period_month: monthStart,
        amount: i.amountRaw,
        status: i.status as StatusLit,
        contract_type,
        memo: i.memo || null,
        year,
        half,
        month,
        sales_key,
        updated_by_id: user.id,
        purchase_cost: purchaseCost.value,
      },
    });
    await replaceExpenses(tx, id, exp.expenses);
  });

  revalidatePath("/sales");
  redirect(`/sales?contract=${contract_type}`);
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
  const contract = String(formData.get("contract") ?? "").trim();
  revalidatePath("/sales");
  redirect(contract ? `/sales?contract=${contract}` : "/sales");
}
