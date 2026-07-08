"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { saveAdminMission, type AdminMissionState } from "../members/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type MissionData = {
  admin_mission: string | null;
  admin_review: string | null;
  self_mission: string | null;
  self_review: string | null;
};

const initial: AdminMissionState = {};

function ReadRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-fg">{label}</div>
      <p className="whitespace-pre-wrap text-sm text-gray-800">
        {value?.trim() ? value : <span className="text-muted-fg">（未記入）</span>}
      </p>
    </div>
  );
}

/**
 * 管理者が、選択中メンバーのミッション（管理者設定）を記入・保存する。
 * 併せて本人の自己記入（振り返り/自己ミッション）を参考表示する。
 */
export function AdminMissionEditor({
  memberId,
  fiscalYear,
  half,
  mission,
}: {
  memberId: string;
  fiscalYear: number;
  half: number;
  mission: MissionData | null;
}) {
  const [state, formAction, isPending] = useActionState(saveAdminMission, initial);
  const [text, setText] = useState(mission?.admin_mission ?? "");

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="member_id" value={memberId} />
        <input type="hidden" name="fiscal_year" value={fiscalYear} />
        <input type="hidden" name="half" value={half} />
        <div>
          <Label htmlFor="admin_mission">この半期のミッション（管理者から）</Label>
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

      {/* 本人の記入（参考・読み取り専用） */}
      <div className="space-y-3 rounded-md border border-gray-200 bg-base/40 p-4">
        <div className="text-sm font-semibold text-brand-dark">本人の記入（参考）</div>
        <ReadRow label="管理者ミッションへの振り返り/進捗" value={mission?.admin_review ?? null} />
        <ReadRow label="自分のミッション" value={mission?.self_mission ?? null} />
        <ReadRow label="自分のミッションの振り返り/進捗" value={mission?.self_review ?? null} />
      </div>
    </div>
  );
}
