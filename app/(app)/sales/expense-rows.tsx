"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_TYPE_OPTIONS } from "@/lib/enums";

export type ExpenseRow = { type: string; amount: string; note: string };

/**
 * 計上経費の可変行入力。＋ボタンで行を追加、×で削除。
 * 交通費・立替経費・その他を同時に複数計上できる。
 * hidden の "expenses"（JSON配列）としてサーバーアクションに送る。
 */
export function ExpenseRows({ initial }: { initial?: ExpenseRow[] }) {
  const [rows, setRows] = useState<ExpenseRow[]>(initial ?? []);

  const addRow = () =>
    setRows((r) => [...r, { type: "Transportation", amount: "", note: "" }]);
  const removeRow = (idx: number) =>
    setRows((r) => r.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<ExpenseRow>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          経費（任意・複数可／売上には含みません）
        </div>
      </div>

      {rows.length === 0 && (
        <p className="mb-3 text-xs text-muted-fg">
          交通費・立替経費・その他を計上する場合は「経費を追加」を押してください。
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="rounded-md border border-gray-100 bg-base/40 p-3"
          >
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`exp_type_${idx}`}>経費区分</Label>
                  <Select
                    id={`exp_type_${idx}`}
                    value={row.type}
                    onChange={(e) => update(idx, { type: e.target.value })}
                  >
                    {EXPENSE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`exp_amount_${idx}`} required>
                    経費額（円）
                  </Label>
                  <Input
                    id={`exp_amount_${idx}`}
                    inputMode="numeric"
                    placeholder="0"
                    value={row.amount}
                    onChange={(e) => update(idx, { amount: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="mt-6 rounded p-1.5 text-muted-fg hover:bg-gray-100 hover:text-alert"
                aria-label="この経費を削除"
                title="削除"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {row.type === "Other" && (
              <div className="mt-3">
                <Label htmlFor={`exp_note_${idx}`} required>
                  備考（その他の内容）
                </Label>
                <Textarea
                  id={`exp_note_${idx}`}
                  value={row.note}
                  onChange={(e) => update(idx, { note: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Plus className="h-4 w-4" />
        経費を追加
      </button>

      {/* サーバーアクションへ JSON で送る */}
      <input type="hidden" name="expenses" value={JSON.stringify(rows)} />
    </div>
  );
}
