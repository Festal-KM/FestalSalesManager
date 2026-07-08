"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

export type MemberOpt = { id: string; name: string; member_code: string };

/** 管理者の個人実績表: メンバー×会計年度×半期のセレクタ。/my?member=&fy=&half= へ遷移 */
export function AdminControls({
  members,
  memberId,
  years,
  fy,
  half,
}: {
  members: MemberOpt[];
  memberId: string;
  years: number[];
  fy: number;
  half: number;
}) {
  const router = useRouter();
  const go = (m: string, f: number | string, h: number | string) =>
    router.push(`/my?member=${m}&fy=${f}&half=${h}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="メンバー"
        className="w-56"
        value={memberId}
        onChange={(e) => go(e.target.value, fy, half)}
      >
        <option value="">（メンバーを選択）</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="会計年度"
        className="w-28"
        value={String(fy)}
        onChange={(e) => go(memberId, e.target.value, half)}
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
        onChange={(e) => go(memberId, fy, e.target.value)}
      >
        <option value="1">上期（4〜9月）</option>
        <option value="2">下期（10〜3月）</option>
      </Select>
    </div>
  );
}
