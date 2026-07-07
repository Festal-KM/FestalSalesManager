import Link from "next/link";
import { cookies } from "next/headers";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser, getCurrentUser } from "@/lib/auth-helpers";
import { applySalesFilter, clearSalesFilter } from "./actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { normalizeToMonthStart } from "@/lib/date";
import { formatYen, formatYearMonth } from "@/lib/format";
import {
  EMPLOYMENT_LABELS,
  SALES_STATUS_LABELS,
  EXPENSE_TYPE_LABELS,
} from "@/lib/enums";
import { syncDueSalesStatuses } from "@/lib/sales-sync";
import { cn } from "@/lib/utils";

export const metadata = { title: "売上一覧 | 成績管理ツール" };

type SP = Promise<{
  start_month?: string;
  end_month?: string;
  status?: string;
  employment?: string;
  member_id?: string;
  client_id?: string;
  keyword?: string;
}>;

export default async function SalesPage({ searchParams }: { searchParams: SP }) {
  // 到来済み（前月以前）の見込みを実績へ自動反映（冪等）
  try {
    await syncDueSalesStatuses();
  } catch {
    // 反映に失敗しても画面表示は継続する
  }

  const [user, dbUser, sp] = await Promise.all([
    getCurrentUser(),
    getCurrentDbUser(),
    searchParams,
  ]);
  const isAdmin = user?.role === "Admin";
  const myMemberId = dbUser?.linked_member?.id ?? null;

  // 開始月・終了月は URL 未指定なら Cookie の記憶値を初期表示に使う（要望）
  const jar = await cookies();
  const startMonth = (sp.start_month ?? jar.get("sales_start_month")?.value ?? "").trim();
  const endMonth = (sp.end_month ?? jar.get("sales_end_month")?.value ?? "").trim();
  const status = sp.status ?? "all";
  const employment = sp.employment ?? "all";
  const memberId = sp.member_id ?? "";
  const clientId = sp.client_id ?? "";
  const keyword = (sp.keyword ?? "").trim();

  // 期間条件: 開始月〜終了月（両端含む）。未指定の端は制限なし。
  const isYm = (v: string) => /^\d{4}-\d{2}$/.test(v);
  const periodRange: { gte?: Date; lte?: Date } = {};
  if (isYm(startMonth)) periodRange.gte = normalizeToMonthStart(startMonth);
  if (isYm(endMonth)) periodRange.lte = normalizeToMonthStart(endMonth);
  const periodWhere =
    periodRange.gte || periodRange.lte ? { period_month: periodRange } : {};

  const sales = await prisma.salesEntry.findMany({
    where: {
      is_deleted: false, // 要件27
      ...periodWhere,
      ...(status !== "all" ? { status: status as "Actual" | "Forecast" } : {}),
      ...(employment !== "all"
        ? { member: { employment_type: employment as "Proper" | "Outsource" } }
        : {}),
      ...(memberId ? { member_id: memberId } : {}),
      ...(clientId ? { client_id: clientId } : {}),
      ...(keyword
        ? {
            OR: [
              { member: { member_code: { contains: keyword, mode: "insensitive" } } },
              { member: { name: { contains: keyword, mode: "insensitive" } } },
              { client: { client_code: { contains: keyword, mode: "insensitive" } } },
              { client: { company_name: { contains: keyword, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      member: true,
      client: true,
      expenses: { orderBy: { created_at: "asc" } },
    },
    orderBy: [{ period_month: "desc" }, { member: { member_code: "asc" } }],
  });

  // フィルタ用の選択肢
  const [members, clients] = await Promise.all([
    prisma.member.findMany({
      where: { is_active: true },
      select: { id: true, member_code: true, name: true },
      orderBy: { member_code: "asc" },
    }),
    prisma.client.findMany({
      where: { is_active: true },
      select: { id: true, client_code: true, company_name: true },
      orderBy: { client_code: "asc" },
    }),
  ]);

  const canEdit = (rowMemberId: string) =>
    isAdmin || (myMemberId != null && rowMemberId === myMemberId);

  return (
    <div>
      <PageHeader title="売上一覧" description="売上の検索・閲覧">
        <Link href="/sales/new" className={cn(buttonVariants({ variant: "primary" }))}>
          <Plus className="h-4 w-4" />
          売上登録
        </Link>
      </PageHeader>

      {/* 検索条件（要件16-2） */}
      <Card className="mb-4 p-4">
        <form action={applySalesFilter} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">開始月</label>
            <Input type="month" name="start_month" defaultValue={startMonth} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">終了月</label>
            <Input type="month" name="end_month" defaultValue={endMonth} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">予実</label>
            <Select name="status" defaultValue={status}>
              <option value="all">すべて</option>
              <option value="Actual">{SALES_STATUS_LABELS.Actual}</option>
              <option value="Forecast">{SALES_STATUS_LABELS.Forecast}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">雇用区分</label>
            <Select name="employment" defaultValue={employment}>
              <option value="all">すべて</option>
              <option value="Proper">{EMPLOYMENT_LABELS.Proper}</option>
              <option value="Outsource">{EMPLOYMENT_LABELS.Outsource}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">メンバー</label>
            <Select name="member_id" defaultValue={memberId}>
              <option value="">すべて</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">取引先</label>
            <Select name="client_id" defaultValue={clientId}>
              <option value="">すべて</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">キーワード</label>
            <Input name="keyword" defaultValue={keyword} placeholder="メンバー名 / 取引先名 / コード" />
          </div>
          <div className="col-span-2 flex items-end gap-2 md:col-span-2">
            <Button type="submit" variant="light">
              検索
            </Button>
            <Button type="submit" formAction={clearSalesFilter} variant="back">
              条件クリア
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {sales.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>対象月</TH>
                <TH>メンバー</TH>
                <TH>雇用区分</TH>
                <TH>取引先</TH>
                <TH className="text-right">売上金額</TH>
                <TH>予実</TH>
                <TH>経費</TH>
                <TH>メモ</TH>
                <TH>操作</TH>
              </TR>
            </THead>
            <TBody>
              {sales.map((s) => (
                <TR key={s.id}>
                  <TD>{formatYearMonth(s.period_month)}</TD>
                  <TD>
                    <div className="font-medium">{s.member.name}</div>
                  </TD>
                  <TD>
                    <Badge variant={s.member.employment_type === "Proper" ? "brand" : "light"}>
                      {EMPLOYMENT_LABELS[s.member.employment_type]}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="font-medium">{s.client.company_name}</div>
                  </TD>
                  <TD className="text-right font-medium">{formatYen(s.amount.toString())}</TD>
                  <TD>
                    <Badge variant={s.status === "Actual" ? "success" : "warning"}>
                      {SALES_STATUS_LABELS[s.status]}
                    </Badge>
                  </TD>
                  <TD>
                    {s.expenses.length === 0 ? (
                      <span className="text-muted-fg">-</span>
                    ) : (
                      <div className="space-y-1">
                        {s.expenses.map((ex) => (
                          <div key={ex.id} className="whitespace-nowrap text-xs">
                            <span className="text-muted-fg">
                              {EXPENSE_TYPE_LABELS[ex.type]}
                            </span>{" "}
                            <span className="font-medium">
                              {formatYen(ex.amount.toString())}
                            </span>
                            {ex.type === "Other" && ex.note && (
                              <span className="ml-1 text-muted-fg">（{ex.note}）</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TD>
                  <TD className="max-w-40 truncate text-muted-fg">{s.memo ?? "-"}</TD>
                  <TD>
                    {canEdit(s.member_id) && (
                      <Link
                        href={`/sales/${s.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        編集
                      </Link>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
