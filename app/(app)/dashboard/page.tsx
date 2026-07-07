import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { SalesBarChart } from "@/components/sales-bar-chart";
import { FiscalYearSelect } from "@/components/fiscal-year-select";
import {
  currentFiscalYear,
  fiscalYearRange,
  trailingMonths,
  toYYYYMM,
} from "@/lib/date";
import { formatYen } from "@/lib/format";
import { EMPLOYMENT_LABELS } from "@/lib/enums";
import { syncDueSalesStatuses } from "@/lib/sales-sync";

export const metadata = { title: "ダッシュボード | 成績管理ツール" };

type SP = Promise<{ fy?: string }>;

/** Prisma Decimal → number（null/undefined は 0） */
function decToNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number((v as { toString(): string }).toString());
}

// 会計年度の月並び（4〜9月＝上期、10〜3月＝下期）
const FIRST_HALF_MONTHS = [4, 5, 6, 7, 8, 9];
const SECOND_HALF_MONTHS = [10, 11, 12, 1, 2, 3];

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  // 到来済み（前月以前）の見込みを実績へ自動反映（冪等）
  try {
    await syncDueSalesStatuses();
  } catch {
    // 反映に失敗しても画面表示は継続する
  }

  const curFy = currentFiscalYear();
  const fy = sp.fy && /^\d{4}$/.test(sp.fy) ? Number(sp.fy) : curFy;

  const { start: fyStart, endExclusive: fyEnd } = fiscalYearRange(fy);
  const fyWhere = {
    is_deleted: false,
    period_month: { gte: fyStart, lt: fyEnd },
  };

  // 直近12ヶ月（当月含む）の範囲
  const months12 = trailingMonths(12);
  const chartStart = months12[0];
  const chartEnd = new Date(
    Date.UTC(
      months12[11].getUTCFullYear(),
      months12[11].getUTCMonth() + 1,
      1,
    ),
  );

  const [fyTotal, fyProper, fyOutsource, perMember, members, monthly] =
    await Promise.all([
      // 当期売上見込み（実績+見込みを合算 = 全ステータス）
      prisma.salesEntry.aggregate({ _sum: { amount: true }, where: fyWhere }),
      prisma.salesEntry.aggregate({
        _sum: { amount: true },
        where: { ...fyWhere, member: { employment_type: "Proper" } },
      }),
      prisma.salesEntry.aggregate({
        _sum: { amount: true },
        where: { ...fyWhere, member: { employment_type: "Outsource" } },
      }),
      // 個人別・月別の売上合計（当該会計年度）
      prisma.salesEntry.groupBy({
        by: ["member_id", "month"],
        where: fyWhere,
        _sum: { amount: true },
      }),
      // 表示対象メンバー（有効なメンバー）
      prisma.member.findMany({
        where: { is_active: true },
        select: {
          id: true,
          member_code: true,
          name: true,
          employment_type: true,
        },
        orderBy: { member_code: "asc" },
      }),
      // 直近12ヶ月の月次売上合計
      prisma.salesEntry.groupBy({
        by: ["period_month"],
        where: { is_deleted: false, period_month: { gte: chartStart, lt: chartEnd } },
        _sum: { amount: true },
      }),
    ]);

  // 個人別マップ: memberId -> (month -> amount)
  const memberMonthMap = new Map<string, Map<number, number>>();
  for (const row of perMember) {
    const inner = memberMonthMap.get(row.member_id) ?? new Map<number, number>();
    inner.set(row.month, decToNum(row._sum.amount));
    memberMonthMap.set(row.member_id, inner);
  }

  const rows = members.map((m) => {
    const byMonth = memberMonthMap.get(m.id) ?? new Map<number, number>();
    const val = (mm: number) => byMonth.get(mm) ?? 0;
    const firstHalf = FIRST_HALF_MONTHS.reduce((s, mm) => s + val(mm), 0);
    const secondHalf = SECOND_HALF_MONTHS.reduce((s, mm) => s + val(mm), 0);
    return { member: m, val, firstHalf, secondHalf };
  });

  // 月次チャートデータ（古い順・12件）
  const monthlyMap = new Map(
    monthly.map((r) => [toYYYYMM(r.period_month), decToNum(r._sum.amount)]),
  );
  const chartData = months12.map((d) => ({
    label: `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    value: monthlyMap.get(toYYYYMM(d)) ?? 0,
  }));

  // 年度セレクタの選択肢（現年度から過去5年 + 翌年度）
  const years = Array.from({ length: 7 }, (_, i) => curFy + 1 - i);

  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        description={`${fy}年度（${fy}年4月〜${fy + 1}年3月）の売上概要`}
      />

      {/* 上段: 当期売上見込み + 直近12ヶ月推移 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="text-sm text-muted-fg">
              当期売上見込み（実績＋見込み）
            </div>
            <div className="mt-2 text-3xl font-bold text-brand-dark">
              {formatYen(decToNum(fyTotal._sum.amount))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-fg">
                  {EMPLOYMENT_LABELS.Proper}
                </div>
                <div className="mt-1 text-lg font-semibold text-brand-dark">
                  {formatYen(decToNum(fyProper._sum.amount))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-fg">
                  {EMPLOYMENT_LABELS.Outsource}
                </div>
                <div className="mt-1 text-lg font-semibold text-brand-dark">
                  {formatYen(decToNum(fyOutsource._sum.amount))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-4 text-sm text-muted-fg">直近12ヶ月の売上推移</div>
            <SalesBarChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      {/* 下段: 個人別実績 */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">個人別実績</h2>
          <FiscalYearSelect years={years} value={fy} />
        </div>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="sticky left-0 z-10 bg-gray-50">メンバー名</TH>
                {FIRST_HALF_MONTHS.map((mm) => (
                  <TH key={mm} className="text-right">
                    {mm}月
                  </TH>
                ))}
                <TH className="bg-gray-100 text-right">上期</TH>
                {SECOND_HALF_MONTHS.map((mm) => (
                  <TH key={mm} className="text-right">
                    {mm}月
                  </TH>
                ))}
                <TH className="bg-gray-100 text-right">下期</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.member.id}>
                  <TD className="sticky left-0 z-10 bg-white">
                    <div className="font-medium">{r.member.name}</div>
                  </TD>
                  {FIRST_HALF_MONTHS.map((mm) => (
                    <TD key={mm} className="text-right tabular-nums">
                      {formatYen(r.val(mm))}
                    </TD>
                  ))}
                  <TD className="bg-gray-50 text-right font-semibold tabular-nums">
                    {formatYen(r.firstHalf)}
                  </TD>
                  {SECOND_HALF_MONTHS.map((mm) => (
                    <TD key={mm} className="text-right tabular-nums">
                      {formatYen(r.val(mm))}
                    </TD>
                  ))}
                  <TD className="bg-gray-50 text-right font-semibold tabular-nums">
                    {formatYen(r.secondHalf)}
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
