import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EMPLOYMENT_LABELS } from "@/lib/enums";
import {
  currentFiscalYear,
  currentFiscalHalf,
  fiscalYearRange,
} from "@/lib/date";
import { formatYen } from "@/lib/format";
import { PeriodSelect } from "./period-select";
import { MissionPanel } from "./mission-panel";
import { SalaryInfo } from "./salary-info";
import { AdminControls } from "./admin-controls";
import { AdminMissionEditor } from "./admin-mission-editor";

export const metadata = { title: "個人実績表 | 成績管理ツール" };

type SP = Promise<{ fy?: string; half?: string; member?: string }>;

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** メンバーの会計年度・月次実績（合計＋月別テーブル） */
function ResultsBlock({ byMonth }: { byMonth: Map<number, number> }) {
  const val = (m: number) => byMonth.get(m) ?? 0;
  const firstHalf = FIRST_HALF_MONTHS.reduce((s, m) => s + val(m), 0);
  const secondHalf = SECOND_HALF_MONTHS.reduce((s, m) => s + val(m), 0);
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-6">
        <div>
          <div className="text-xs text-muted-fg">年間合計</div>
          <div className="mt-1 text-2xl font-bold text-brand-dark">
            {formatYen(firstHalf + secondHalf)}
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
            {[...FIRST_HALF_MONTHS, ...SECOND_HALF_MONTHS].map((m) => (
              <TH key={m} className="text-right">
                {m}月
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          <TR>
            {[...FIRST_HALF_MONTHS, ...SECOND_HALF_MONTHS].map((m) => (
              <TD key={m} className="text-right tabular-nums">
                {formatYen(val(m))}
              </TD>
            ))}
          </TR>
        </TBody>
      </Table>
    </>
  );
}

/** メンバーの当該会計年度の月別売上合計を Map<month, amount> で返す */
async function fetchMonthly(memberId: string, fy: number) {
  const { start, endExclusive } = fiscalYearRange(fy);
  const rows = await prisma.salesEntry.groupBy({
    by: ["month"],
    where: {
      is_deleted: false,
      member_id: memberId,
      period_month: { gte: start, lt: endExclusive },
    },
    _sum: { amount: true },
  });
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.month, decToNum(r._sum.amount));
  return map;
}

function missionWhere(memberId: string, fy: number, half: number) {
  return {
    member_id_fiscal_year_half: { member_id: memberId, fiscal_year: fy, half },
  };
}

export default async function MyPage({ searchParams }: { searchParams: SP }) {
  const [dbUser, sp] = await Promise.all([getCurrentDbUser(), searchParams]);
  const isAdmin = dbUser?.role === "Admin";

  const curFy = currentFiscalYear();
  const fy = sp.fy && /^\d{4}$/.test(sp.fy) ? Number(sp.fy) : curFy;
  const half = sp.half === "2" ? 2 : sp.half === "1" ? 1 : currentFiscalHalf();
  const years = Array.from({ length: 7 }, (_, i) => curFy + 1 - i);

  // ===== 管理者: メンバー別実績一覧 → ミッション設定 =====
  if (isAdmin) {
    const members = await prisma.member.findMany({
      where: { is_active: true },
      select: { id: true, name: true, member_code: true, employment_type: true },
      orderBy: { member_code: "asc" },
    });
    const memberId = sp.member ?? "";
    const selected = memberId ? members.find((m) => m.id === memberId) : null;

    // 一覧（未選択時）: 全メンバーの当年度 上期/下期/年間
    let overview: {
      member: (typeof members)[number];
      first: number;
      second: number;
      total: number;
    }[] = [];
    if (!selected) {
      const { start, endExclusive } = fiscalYearRange(fy);
      const grouped = await prisma.salesEntry.groupBy({
        by: ["member_id", "month"],
        where: { is_deleted: false, period_month: { gte: start, lt: endExclusive } },
        _sum: { amount: true },
      });
      const mm = new Map<string, Map<number, number>>();
      for (const r of grouped) {
        const inner = mm.get(r.member_id) ?? new Map<number, number>();
        inner.set(r.month, decToNum(r._sum.amount));
        mm.set(r.member_id, inner);
      }
      overview = members.map((m) => {
        const bm = mm.get(m.id) ?? new Map<number, number>();
        const v = (x: number) => bm.get(x) ?? 0;
        const first = FIRST_HALF_MONTHS.reduce((s, x) => s + v(x), 0);
        const second = SECOND_HALF_MONTHS.reduce((s, x) => s + v(x), 0);
        return { member: m, first, second, total: first + second };
      });
    }

    const [byMonth, mission] = selected
      ? await Promise.all([
          fetchMonthly(selected.id, fy),
          prisma.mission.findUnique({ where: missionWhere(selected.id, fy, half) }),
        ])
      : [new Map<number, number>(), null];

    return (
      <div>
        <PageHeader
          eyebrow="My Performance"
          title="個人実績表"
          description={
            selected
              ? `${selected.name} さんの実績とミッション設定`
              : "メンバー別の実績一覧 ・ 行を開くとミッションを設定できます"
          }
          backHref={selected ? `/my?fy=${fy}&half=${half}` : undefined}
        >
          <AdminControls
            members={members}
            memberId={memberId}
            years={years}
            fy={fy}
            half={half}
          />
        </PageHeader>

        {!selected ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <div>
                <div className="eyebrow text-brand">Members</div>
                <h2 className="mt-1 text-base font-semibold text-ink">
                  メンバー別実績
                </h2>
              </div>
              <div className="text-xs text-muted-fg">{fy}年度</div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* ヘッダー行 */}
                <div className="grid grid-cols-[minmax(0,1.6fr)_auto_1fr_1fr_1fr] items-center gap-4 border-b border-line px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                  <div>メンバー</div>
                  <div>雇用区分</div>
                  <div className="text-right">上期</div>
                  <div className="text-right">下期</div>
                  <div className="text-right">年間合計</div>
                </div>
                {/* 行全体がリンク */}
                {overview.map((r) => (
                  <Link
                    key={r.member.id}
                    href={`/my?member=${r.member.id}&fy=${fy}&half=${half}`}
                    className="grid grid-cols-[minmax(0,1.6fr)_auto_1fr_1fr_1fr] items-center gap-4 border-b border-line px-6 py-3.5 transition-colors last:border-0 hover:bg-base"
                  >
                    <div className="truncate font-medium text-ink">
                      {r.member.name}
                    </div>
                    <div>
                      <Badge
                        variant={
                          r.member.employment_type === "Proper" ? "brand" : "light"
                        }
                      >
                        {EMPLOYMENT_LABELS[r.member.employment_type]}
                      </Badge>
                    </div>
                    <div className="tnum text-right text-muted-fg">
                      {formatYen(r.first)}
                    </div>
                    <div className="tnum text-right text-muted-fg">
                      {formatYen(r.second)}
                    </div>
                    <div className="tnum text-right font-semibold text-ink">
                      {formatYen(r.total)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Section title={`${selected.name}｜${fy}年度の実績`}>
              <ResultsBlock byMonth={byMonth} />
            </Section>
            <Section
              title={`${selected.name}｜ミッション設定（${fy}年度 ${half === 1 ? "上期" : "下期"}）`}
            >
              <AdminMissionEditor
                key={`${selected.id}-${fy}-${half}`}
                memberId={selected.id}
                fiscalYear={fy}
                half={half}
                mission={mission}
              />
            </Section>
          </>
        )}
      </div>
    );
  }

  // ===== 一般ユーザー: 本人の個人実績表 =====
  const member = dbUser?.linked_member ?? null;
  if (!member) {
    return (
      <div>
        <PageHeader eyebrow="My Performance" title="個人実績表" description="自分の実績・ミッション・給与体系" />
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

  const [byMonth, mission] = await Promise.all([
    fetchMonthly(member.id, fy),
    prisma.mission.findUnique({ where: missionWhere(member.id, fy, half) }),
  ]);

  return (
    <div>
      <PageHeader
          eyebrow="My Performance"
        title="個人実績表"
        description={`${member.name} さんの実績・ミッション・給与体系`}
      >
        <PeriodSelect years={years} fy={fy} half={half} />
      </PageHeader>

      <Section title={`${fy}年度の実績`}>
        <ResultsBlock byMonth={byMonth} />
      </Section>

      <Section title={`ミッション（${fy}年度 ${half === 1 ? "上期" : "下期"}）`}>
        <MissionPanel
          key={`${fy}-${half}`}
          fiscalYear={fy}
          half={half}
          mission={mission}
        />
      </Section>

      <Section title="給与体系">
        <SalaryInfo />
      </Section>
    </div>
  );
}
