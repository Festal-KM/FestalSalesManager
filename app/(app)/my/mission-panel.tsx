"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { saveMyMission, type MyMissionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type MissionData = {
  admin_mission: string | null;
  admin_review: string | null;
  self_mission: string | null;
  self_review: string | null;
};

const initial: MyMissionState = {};

export function MissionPanel({
  fiscalYear,
  half,
  mission,
}: {
  fiscalYear: number;
  half: number;
  mission: MissionData | null;
}) {
  const [state, formAction, isPending] = useActionState(saveMyMission, initial);

  // 初期値はマウント時に props から。期間切替時は親側で key を変えて再マウントする。
  const [adminReview, setAdminReview] = useState(mission?.admin_review ?? "");
  const [selfMission, setSelfMission] = useState(mission?.self_mission ?? "");
  const [selfReview, setSelfReview] = useState(mission?.self_review ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="fiscal_year" value={fiscalYear} />
      <input type="hidden" name="half" value={half} />

      {/* 管理者が課すミッション */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-2 text-sm font-semibold text-brand-dark">
          管理者からのミッション
        </div>
        {mission?.admin_mission ? (
          <p className="whitespace-pre-wrap rounded bg-base/60 p-3 text-sm text-gray-800">
            {mission.admin_mission}
          </p>
        ) : (
          <p className="text-sm text-muted-fg">（まだ設定されていません）</p>
        )}
        <div className="mt-3">
          <Label htmlFor="admin_review">振り返り / 進捗（自己記入）</Label>
          <Textarea
            id="admin_review"
            name="admin_review"
            rows={3}
            value={adminReview}
            onChange={(e) => setAdminReview(e.target.value)}
            placeholder="管理者ミッションへの取り組み状況・振り返りを記入"
          />
        </div>
      </div>

      {/* 本人が作成するミッション */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-2 text-sm font-semibold text-brand-dark">
          自分のミッション
        </div>
        <div>
          <Label htmlFor="self_mission">ミッション（自己記入）</Label>
          <Textarea
            id="self_mission"
            name="self_mission"
            rows={3}
            value={selfMission}
            onChange={(e) => setSelfMission(e.target.value)}
            placeholder="この半期に自分で取り組む目標を記入"
          />
        </div>
        <div className="mt-3">
          <Label htmlFor="self_review">振り返り / 進捗（自己記入）</Label>
          <Textarea
            id="self_review"
            name="self_review"
            rows={3}
            value={selfReview}
            onChange={(e) => setSelfReview(e.target.value)}
            placeholder="自分のミッションの進捗・振り返りを記入"
          />
        </div>
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

      <Button type="submit" loading={isPending}>
        保存
      </Button>
    </form>
  );
}
