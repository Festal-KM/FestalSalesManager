"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

/** 会計年度を選ぶと ?fy= を差し替えて遷移する（個人別実績の年度切替） */
export function FiscalYearSelect({
  years,
  value,
}: {
  years: number[];
  value: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <Select
      defaultValue={String(value)}
      className="w-32"
      aria-label="会計年度"
      onChange={(e) => {
        const sp = new URLSearchParams(params.toString());
        sp.set("fy", e.target.value);
        router.push(`/dashboard?${sp.toString()}`);
      }}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}年度
        </option>
      ))}
    </Select>
  );
}
