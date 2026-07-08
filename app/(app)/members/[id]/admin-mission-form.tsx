"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { saveAdminMission, type AdminMissionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type AdminMissionItem = {
  fiscal_year: number;
  half: number;
  admin_mission: string | null;
};

const initial: AdminMissionState = {};

/** メンバー編集画面: 管理者が課すミッションを会計年度×半期ごとに設定 */
export function AdminMissionForm({
  memberId,
  years,
  defaultFy,
  defaultHalf,
  missions,
}: {
  memberId: string;
  years: number[];
  defaultFy: number;
  defaultHalf: number;
  missions: AdminMissionItem[];
}) {
  const [state, formAction, isPending] = useActionState(saveAdminMission, initial);

  const [fy, setFy] = useState(defaultFy);
  const [half, setHalf] = useState(defaultHalf);

  const existing = useMemo(
    () => missions.find((m) => m.fiscal_year === fy && m.half === half),
    [missions, fy, half],
  );

  // 期間を変えたら、その期間の既存ミッションを textarea に反映
  const [text, setText] = useState(existing?.admin_mission ?? "");
  const [lastKey, setLastKey] = useState(`${fy}-${half}`);
  const curKey = `${fy}-${half}`;
  if (curKey !== lastKey) {
    setLastKey(curKey);
    setText(existing?.admin_mission ?? "");
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="fiscal_year" value={fy} />
      <input type="hidden" name="half" value={half} />

      <div className="flex items-center gap-2">
        <Select
          aria-label="会計年度"
          className="w-28"
          value={String(fy)}
          onChange={(e) => setFy(Number(e.target.value))}
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
          onChange={(e) => setHalf(Number(e.target.value))}
        >
          <option value="1">上期（4〜9月）</option>
          <option value="2">下期（10〜3月）</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="admin_mission">この半期のミッション（管理者設定）</Label>
        <Textarea
          id="admin_mission"
          name="admin_mission"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="このメンバーに課すミッションを記入"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && !isPending && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <Check className="h-4 w-4 shrink-0" />
          <span>保存しました</span>
        </div>
      )}

      <Button type="submit" variant="light" loading={isPending}>
        ミッションを保存
      </Button>
    </form>
  );
}
