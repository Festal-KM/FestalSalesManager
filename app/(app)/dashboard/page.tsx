import Link from "next/link";
import { Receipt, Plus, Users, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  normalizeToMonthStart,
  toMonthInputValue,
  currentMonthStart,
} from "@/lib/date";
import { formatYen, formatYearMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "ダッシュボード | 成績管理ツール" };

type SP = Promise<{ month?: string }>;

function sumToStr(a: { _sum: { amount: unknown } }): string {
  const v = a._sum.amount as { toString(): string } | null;
  return v ? v.toString() : "0";
}

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const selected = sp.month ? normalizeToMonthStart(sp.month) : currentMonthStart();
  const base = { is_deleted: false, period_month: selected };

  // KPI集計（要件15-5）
  const [actual, forecast, proper, outsource] = await Promise.all([
    prisma.salesEntry.aggregate({ _sum: { amount: true }, where: { ...base, status: "Actual" } }),
    prisma.salesEntry.aggregate({ _sum: { amount: true }, where: { ...base, status: "Forecast" } }),
    prisma.salesEntry.aggregate({
      _sum: { amount: true },
      where: { ...base, member: { employment_type: "Proper" } },
    }),
    prisma.salesEntry.aggregate({
      _sum: { amount: true },
      where: { ...base, member: { employment_type: "Outsource" } },
    }),
  ]);

  const kpis = [
    { label: "当月売上 実績", value: sumToStr(actual), accent: "text-brand-dark" },
    { label: "当月売上 見込み", value: sumToStr(forecast), accent: "text-brand-light" },
    { label: "プロパー売上", value: sumToStr(proper), accent: "text-brand-dark" },
    { label: "外注売上", value: sumToStr(outsource), accent: "text-brand-dark" },
  ];

  const links = [
    { href: "/sales", label: "売上一覧", icon: Receipt },
    { href: "/sales/new", label: "売上登録", icon: Plus },
    { href: "/members", label: "メンバー一覧", icon: Users },
    { href: "/clients", label: "取引先一覧", icon: Building2 },
  ];

  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        description={`${formatYearMonth(selected)}の売上概要`}
      >
        <form method="get" className="flex items-end gap-2">
          <Input
            type="month"
            name="month"
            defaultValue={toMonthInputValue(selected)}
            className="w-40"
          />
          <Button type="submit" variant="light">
            表示
          </Button>
        </form>
      </PageHeader>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent>
              <div className="text-sm text-muted-fg">{k.label}</div>
              <div className={cn("mt-2 text-2xl font-bold", k.accent)}>
                {formatYen(k.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 導線（要件15-6） */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-20 flex-col gap-2 bg-white",
              )}
            >
              <Icon className="h-6 w-6 text-brand-dark" />
              <span className="text-sm">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
