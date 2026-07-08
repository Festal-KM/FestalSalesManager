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
  contract,
}: {
  members: MemberOption[];
  clients: ClientOption[];
  contract: string;
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
  const [purchaseCost, setPurchaseCost] = useState("");

  const selectedMember = members.find((m) => m.id === memberId);
  const isOutsource = selectedMember?.employment_type === "Outsource";

  // メンバー選択時、外注ならメンバー登録の仕入単価を初期値として引き込む
  const onMemberChange = (id: string) => {
    setMemberId(id);
    const m = members.find((x) => x.id === id);
    if (m?.employment_type === "Outsource") {
      setPurchaseCost(m.purchase_unit_price ?? "");
    } else {
      setPurchaseCost("");
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="contract" value={contract} />
        <div>
          <Label htmlFor="b_member_id" required>
            メンバー
          </Label>
          <Select
            id="b_member_id"
            name="member_id"
            value={memberId}
            onChange={(e) => onMemberChange(e.target.value)}
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

        {/* コスト（任意・複数可）— 各月に同じ内容で計上 */}
        <ExpenseRows />

        {/* 外注のみ: メンバーの仕入単価を自動表示（編集可）。コストと同デザイン */}
        {isOutsource && (
          <div className="rounded-md border border-gray-200 p-3">
            <div className="mb-3 text-sm font-medium text-gray-700">
              仕入単価（外注・各月に計上）
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="purchase_cost">仕入単価（月額・円）</Label>
                <Input
                  id="purchase_cost"
                  name="purchase_cost"
                  inputMode="numeric"
                  placeholder="0"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-fg">
                  メンバー登録の仕入単価を自動入力しています（変更可）。
                </p>
              </div>
            </div>
          </div>
        )}

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
            href={`/sales?contract=${contract}`}
            className="inline-flex h-10 items-center rounded-md bg-backbtn px-4 text-sm font-medium text-backbtn-fg hover:bg-backbtn-hover hover:text-backbtn-fg-hover"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
