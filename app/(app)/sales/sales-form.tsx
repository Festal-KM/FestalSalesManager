"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  createSales,
  updateSales,
  deleteSales,
  type SalesFormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SALES_STATUS_OPTIONS } from "@/lib/enums";

export type MemberOption = { id: string; member_code: string; name: string };
export type ClientOption = { id: string; client_code: string; company_name: string };

export type SalesEntryData = {
  id: string;
  member_id: string;
  client_id: string;
  period_month: string; // "YYYY-MM"
  amount: string;
  status: string;
  memo: string | null;
};

const initial: SalesFormState = {};

export function SalesForm({
  mode,
  members,
  clients,
  entry,
  canDelete,
}: {
  mode: "new" | "edit";
  members: MemberOption[];
  clients: ClientOption[];
  entry?: SalesEntryData;
  canDelete?: boolean;
}) {
  const action = mode === "new" ? createSales : updateSales;
  const [state, formAction, isPending] = useActionState(action, initial);

  const [memberId, setMemberId] = useState(entry?.member_id ?? "");
  const [clientId, setClientId] = useState(entry?.client_id ?? "");
  const [periodMonth, setPeriodMonth] = useState(entry?.period_month ?? "");
  const [status, setStatus] = useState(entry?.status ?? "");

  const memberCode = members.find((m) => m.id === memberId)?.member_code ?? "";
  const clientCode = clients.find((c) => c.id === clientId)?.client_code ?? "";
  const yyyymm = periodMonth ? periodMonth.replace("-", "") : "";
  const salesKey =
    memberCode && clientCode && yyyymm && status
      ? `${memberCode}_${clientCode}_${yyyymm}_${status}`
      : "（メンバー・取引先・対象月・予実を選ぶと自動生成）";

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        {mode === "edit" && <input type="hidden" name="id" value={entry!.id} />}

        <div>
          <Label htmlFor="member_id" required>
            メンバー
          </Label>
          <Select
            id="member_id"
            name="member_id"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">（選択してください）</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.member_code} / {m.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="client_id" required>
            取引先
          </Label>
          <Select
            id="client_id"
            name="client_id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">（選択してください）</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_code} / {c.company_name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="period_month" required>
              対象月
            </Label>
            <Input
              id="period_month"
              name="period_month"
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="status" required>
              予実区分
            </Label>
            <Select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">（選択してください）</option>
              {SALES_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="amount" required>
            売上金額（円）
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step={1}
            defaultValue={entry?.amount ?? ""}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="memo">メモ</Label>
          <Textarea id="memo" name="memo" defaultValue={entry?.memo ?? ""} />
        </div>

        <div>
          <Label>sales_key（自動生成・編集不可）</Label>
          <Input value={salesKey} readOnly disabled className="font-mono text-xs" />
        </div>

        {state.error && (
          <div className="flex items-center gap-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" loading={isPending}>
            {mode === "new" ? "登録" : "更新"}
          </Button>
          <Link
            href="/sales"
            className="inline-flex h-10 items-center rounded-md bg-backbtn px-4 text-sm font-medium text-backbtn-fg hover:bg-backbtn-hover hover:text-backbtn-fg-hover"
          >
            キャンセル
          </Link>
        </div>
      </form>

      {/* 論理削除（Admin のみ・編集時のみ） */}
      {mode === "edit" && canDelete && (
        <form action={deleteSales} className="border-t border-gray-100 pt-4">
          <input type="hidden" name="id" value={entry!.id} />
          <Button type="submit" variant="destructive">
            この売上を削除する（論理削除）
          </Button>
        </form>
      )}
    </div>
  );
}
