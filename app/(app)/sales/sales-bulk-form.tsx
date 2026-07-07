"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import { createSalesBulk, type SalesFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseRows } from "./expense-rows";
import type { MemberOption, ClientOption } from "./sales-form";

const initial: SalesFormState = {};

export function SalesBulkForm({
  members,
  clients,
}: {
  members: MemberOption[];
  clients: ClientOption[];
}) {
  const [state, formAction, isPending] = useActionState(createSalesBulk, initial);

  // 入力はすべて制御コンポーネントで保持し、送信後のフォーム自動リセットや
  // バリデーションエラーでも入力値が消えないようにする。
  const [memberId, setMemberId] = useState("");
  const [clientId, setClientId] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="b_member_id" required>
            メンバー
          </Label>
          <Select
            id="b_member_id"
            name="member_id"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">（選択してください）</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="b_client_id" required>
            取引先
          </Label>
          <Select
            id="b_client_id"
            name="client_id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">（選択してください）</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start_month" required>
              開始月
            </Label>
            <Input
              id="start_month"
              name="start_month"
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end_month" required>
              終了月
            </Label>
            <Input
              id="end_month"
              name="end_month"
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="b_amount" required>
            月額（売上金額・円）
          </Label>
          <Input
            id="b_amount"
            name="amount"
            inputMode="numeric"
            placeholder="1000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* 計上経費（任意・複数可）— 各月に同じ内容で計上 */}
        <ExpenseRows />

        <div>
          <Label htmlFor="b_memo">メモ</Label>
          <Textarea
            id="b_memo"
            name="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {state.error && (
          <div className="flex items-center gap-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" loading={isPending}>
            登録
          </Button>
          <Link
            href="/sales"
            className="inline-flex h-10 items-center rounded-md bg-backbtn px-4 text-sm font-medium text-backbtn-fg hover:bg-backbtn-hover hover:text-backbtn-fg-hover"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
