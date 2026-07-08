import { getCurrentDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  currentFiscalYear,
  currentFiscalHalf,
  fiscalYearRange,
} from "@/lib/date";
import { formatYen } from "@/lib/format";
import { syncDueSalesStatuses } from "@/lib/sales-sync";
import { PeriodSelect } from "./period-select";
import { MissionPanel } from "./mission-panel";
import { SalaryInfo } from "./salary-info";

export const metadata = { title: "個人実績表 | 成績管理ツール" };

type SP = Promise<{ fy?: string; half?: string }>;

const FIRST_HALF_MONTHS = [4, 5, 6, 7, 8, 9];
const SECOND_HALF_MONTHS = [10, 11, 12, 1, 2, 3];

function decToNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number((v as { toString(): string }).toString());
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function MyPage({ searchParams }: { searchParams: SP }) {
  try {
    await syncDueSalesStatuses();
  } catch {
    // 表示は継続
  }

  const [dbUser, sp] = await Promise.all([getCurrentDbUser(), searchParams]);
  const member = dbUser?.linked_member ?? null;

  const curFy = currentFiscalYear();
  const fy = sp.fy && /^\d{4}$/.test(sp.fy) ? Number(sp.fy) : curFy;
  const half = sp.half === "2" ? 2 : sp.half === "1" ? 1 : currentFiscalHalf();
  const years = Array.from({ length: 7 }, (_, i) => curFy + 1 - i);

  if (!member) {
    return (
      <div>
        <PageHeader title="個人実績表" description="自分の実績・ミッション・給与体系" />
        <Card>
          <CardContent>
            <p className="text-sm text-muted-fg">
              あなたのログインには紐づくメンバーがありません。管理者にメンバーとの紐づけを依頼してください。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { start: fyStart, endExclusive: fyEnd } = fiscalYearRange(fy);

  const [perMonth, mission] = await Promise.all([
    prisma.salesEntry.groupBy({
      by: ["month"],
      where: {
        is_deleted: false,
        member_id: member.id,
        period_month: { gte: fyStart, lt: fyEnd },
      },
      _sum: { amount: true },
    }),
    prisma.mission.findUnique({
      where: {
        member_id_fiscal_year_half: {
          member_id: member.id,
          fiscal_year: fy,
          half,
        },
      },
    }),
  ]);

  const byMonth = new Map<number, number>();
  for (const r of perMonth) byMonth.set(r.month, decToNum(r._sum.amount));
  const val = (m: number) => byMonth.get(m) ?? 0;
  const firstHalf = FIRST_HALF_MONTHS.reduce((s, m) => s + val(m), 0);
  const secondHalf = SECOND_HALF_MONTHS.reduce((s, m) => s + val(m), 0);
  const yearTotal = firstHalf + secondHalf;

  return (
    <div>
      <PageHeader
        title="個人実績表"
        description={`${member.name} さんの実績・ミッション・給与体系`}
      >
        <PeriodSelect years={years} fy={fy} half={half} />
      </PageHeader>

      {/* 実績 */}
      <Section title={`${fy}年度の実績`}>
        <div className="mb-4 flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-muted-fg">年間合計</div>
            <div className="mt-1 text-2xl font-bold text-brand-dark">
              {formatYen(yearTotal)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-fg">上期</div>
            <div className="mt-1 text-lg font-semibold text-brand-dark">
              {formatYen(firstHalf)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-fg">下期</div>
            <div className="mt-1 text-lg font-semibold text-brand-dark">
              {formatYen(secondHalf)}
            </div>
          </div>
        </div>
        <Table>
          <THead>
            <TR>
              {FIRST_HALF_MONTHS.map((m) => (
                <TH key={m} className="text-right">
                  {m}月
                </TH>
              ))}
              {SECOND_HALF_MONTHS.map((m) => (
                <TH key={m} className="text-right">
                  {m}月
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            <TR>
              {FIRST_HALF_MONTHS.map((m) => (
                <TD key={m} className="text-right tabular-nums">
                  {formatYen(val(m))}
                </TD>
              ))}
              {SECOND_HALF_MONTHS.map((m) => (
                <TD key={m} className="text-right tabular-nums">
                  {formatYen(val(m))}
                </TD>
              ))}
            </TR>
          </TBody>
        </Table>
      </Section>

      {/* ミッション */}
      <Section title={`ミッション（${fy}年度 ${half === 1 ? "上期" : "下期"}）`}>
        <MissionPanel
          key={`${fy}-${half}`}
          fiscalYear={fy}
          half={half}
          mission={mission}
        />
      </Section>

      {/* 給与体系 */}
      <Section title="給与体系">
        <SalaryInfo />
      </Section>
    </div>
  );
}
