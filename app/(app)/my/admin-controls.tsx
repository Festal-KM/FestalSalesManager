"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

/** 管理者の個人実績表（メンバー選択時）: 会計年度×半期のセレクタ。/my?member=&fy=&half= へ遷移 */
export function AdminControls({
  memberId,
  years,
  fy,
  half,
}: {
  memberId: string;
  years: number[];
  fy: number;
  half: number;
}) {
  const router = useRouter();
  const go = (f: number | string, h: number | string) =>
    router.push(`/my?member=${memberId}&fy=${f}&half=${h}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="会計年度"
        className="w-28"
        value={String(fy)}
        onChange={(e) => go(e.target.value, half)}
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
        onChange={(e) => go(fy, e.target.value)}
      >
        <option value="1">上期（4〜9月）</option>
        <option value="2">下期（10〜3月）</option>
      </Select>
    </div>
  );
}
