"use client";

import { useState } from "react";
import {
  GRADE_ORDER,
  GRADE_LABELS,
  GRADE_PARAMS,
  salaryTable,
  type GradeKey,
} from "@/lib/salary-tables";
import { Select } from "@/components/ui/select";
import { formatYen } from "@/lib/format";
import { cn } from "@/lib/utils";

function pct(n: number): string {
  const v = n * 100;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

const COLS: { key: string; label: string }[] = [
  { key: "monthly", label: "月額" },
  { key: "annual", label: "年額" },
  { key: "baseBonus", label: "基準賞与" },
  { key: "annualPlusBonus", label: "年額＋賞与" },
  { key: "targetIncome", label: "年収目安" },
  { key: "withInsurance", label: "社保込み" },
  { key: "deptBudget", label: "事業部予算" },
  { key: "salesTarget", label: "売上目標" },
];

export function SalaryTable({
  currentGrade,
  currentPitch,
}: {
  currentGrade: GradeKey | null;
  currentPitch: number | null;
}) {
  const [grade, setGrade] = useState<GradeKey>(currentGrade ?? "Analyst");
  const p = GRADE_PARAMS[grade];
  const rows = salaryTable(grade);
  const viewingOwn = currentGrade === grade;

  return (
    <div className="space-y-4">
      {/* 現在の役職・ピッチ */}
      <div className="rounded-lg border border-line bg-base/50 px-4 py-3 text-sm">
        {currentGrade ? (
          <span>
            現在の役職：
            <span className="font-semibold text-ink">
              {GRADE_LABELS[currentGrade]}
            </span>
            {"　"}／{"　"}ピッチ：
            <span className="font-semibold text-ink">
              {currentPitch ?? "未設定"}
            </span>
          </span>
        ) : (
          <span className="text-muted-fg">
            役職・ピッチが未設定です。管理者にご確認ください。
          </span>
        )}
      </div>

      {/* 役職セレクタ＋パラメータ */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            役職（大枠）
          </label>
          <Select
            aria-label="役職"
            className="w-56"
            value={grade}
            onChange={(e) => setGrade(e.target.value as GradeKey)}
          >
            {GRADE_ORDER.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABELS[g]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-fg">
          <span>
            分配率 <span className="font-semibold text-ink">{pct(p.distribution)}</span>
          </span>
          <span>
            賞与比率 <span className="font-semibold text-ink">{pct(p.bonusRatio)}</span>
          </span>
          <span>
            ピッチ額{" "}
            <span className="font-semibold text-ink">{formatYen(p.pitchAmount)}</span>
          </span>
        </div>
      </div>

      {/* 給与テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-brand/10 text-brand-dark">
              <th className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                ピッチ
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-3 py-2 text-right font-semibold"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const highlighted = viewingOwn && r.pitch === currentPitch;
              return (
                <tr
                  key={r.pitch}
                  className={
                    highlighted
                      ? "bg-brand/15"
                      : "border-b border-line last:border-0 hover:bg-base/60"
                  }
                >
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 text-center font-medium",
                      highlighted && "border-y border-l border-brand/40"
                    )}
                  >
                    {r.pitch}
                    {highlighted && (
                      <span className="ml-1 text-[10px] font-bold text-brand">●</span>
                    )}
                  </td>
                  {COLS.map((c, ci) => (
                    <td
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap px-3 py-1.5 text-right tabular-nums",
                        highlighted && "border-y border-brand/40",
                        highlighted && ci === COLS.length - 1 && "border-r"
                      )}
                    >
                      {formatYen(r[c.key as keyof typeof r] as number)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-fg">
        年収目安はインセンティブ込み。社保込みは会社負担分を含む概算です。
      </p>
    </div>
  );
}
