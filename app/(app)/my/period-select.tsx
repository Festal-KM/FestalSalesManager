"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

/** マイページの会計年度・半期セレクタ。選ぶと /my?fy=&half= へ遷移 */
export function PeriodSelect({
  years,
  fy,
  half,
}: {
  years: number[];
  fy: number;
  half: number;
}) {
  const router = useRouter();
  const go = (nextFy: number, nextHalf: number) =>
    router.push(`/my?fy=${nextFy}&half=${nextHalf}`);

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="会計年度"
        className="w-28"
        value={String(fy)}
        onChange={(e) => go(Number(e.target.value), half)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}年度
          </option>
        ))}
      </Select>
      <Select
        aria-label="半期"
        className="w-36"
        value={String(half)}
        onChange={(e) => go(fy, Number(e.target.value))}
      >
        <option value="1">上期（4〜9月）</option>
        <option value="2">下期（10〜3月）</option>
      </Select>
    </div>
  );
}
