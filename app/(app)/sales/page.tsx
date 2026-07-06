import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser, getCurrentUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  normalizeToMonthStart,
  deriveYearHalfMonth,
  toMonthInputValue,
  currentMonthStart,
} from "@/lib/date";
import { formatYen, formatYearMonth } from "@/lib/format";
import { EMPLOYMENT_LABELS, SALES_STATUS_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata = { title: "売上一覧 | 成績管理ツール" };

type SP = Promise<{
  period_type?: string;
  month?: string;
  year?: string;
  half?: string;
  status?: string;
  employment?: string;
  member_id?: string;
  client_id?: string;
  keyword?: string;
}>;

export default async function SalesPage({ searchParams }: { searchParams: SP }) {
  const [user, dbUser, sp] = await Promise.all([
    getCurrentUser(),
    getCurrentDbUser(),
    searchParams,
  ]);
  const isAdmin = user?.role === "Admin";
  const myMemberId = dbUser?.linked_member?.id ?? null;

  const cur = currentMonthStart();
  const curDerived = deriveYearHalfMonth(cur);

  const period_type = sp.period_type ?? "month";
  const month = sp.month || toMonthInputValue(cur);
  const year = Number(sp.year || curDerived.year);
  const half = Number(sp.half || curDerived.half);
  const status = sp.status ?? "all";
  const employment = sp.employment ?? "all";
  const memberId = sp.member_id ?? "";
  const clientId = sp.client_id ?? "";
  const keyword = (sp.keyword ?? "").trim();

  // 期間条件（要件16-5）
  let periodWhere: Record<string, unknown> = {};
  if (period_type === "month") {
    periodWhere = { period_month: normalizeToMonthStart(month) };
  } else if (period_type === "half") {
    periodWhere = { year, half };
  } else if (period_type === "year") {
    periodWhere = { year };
  }

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
    include: { member: true, client: true },
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
        <form method="get" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">期間タイプ</label>
            <Select name="period_type" defaultValue={period_type}>
              <option value="month">月</option>
              <option value="half">半期</option>
              <option value="year">年</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">対象月</label>
            <Input type="month" name="month" defaultValue={month} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">対象年</label>
            <Input type="number" name="year" defaultValue={year} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">半期</label>
            <Select name="half" defaultValue={String(half)}>
              <option value="1">上期(1〜6月)</option>
              <option value="2">下期(7〜12月)</option>
            </Select>
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
                  {m.member_code} / {m.name}
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
                  {c.client_code} / {c.company_name}
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
            <Link href="/sales" className={cn(buttonVariants({ variant: "back" }))}>
              条件クリア
            </Link>
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
                    <div className="font-mono text-xs text-muted-fg">
                      {s.member.member_code}
                    </div>
                  </TD>
                  <TD>
                    <Badge variant={s.member.employment_type === "Proper" ? "brand" : "light"}>
                      {EMPLOYMENT_LABELS[s.member.employment_type]}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="font-medium">{s.client.company_name}</div>
                    <div className="font-mono text-xs text-muted-fg">
                      {s.client.client_code}
                    </div>
                  </TD>
                  <TD className="text-right font-medium">{formatYen(s.amount.toString())}</TD>
                  <TD>
                    <Badge variant={s.status === "Actual" ? "success" : "warning"}>
                      {SALES_STATUS_LABELS[s.status]}
                    </Badge>
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
