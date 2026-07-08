"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ContactRow = { name: string; contact_method: string };

/**
 * 取引先の担当者（複数）入力。＋ボタンで行を追加、×で削除。
 * 各行 = 担当者名 ＋ 連絡手段（自由記載: メール/Slack等）。
 * hidden の "contacts"（JSON配列）としてサーバーアクションに送る。
 */
export function ContactRows({ initial }: { initial?: ContactRow[] }) {
  const [rows, setRows] = useState<ContactRow[]>(initial ?? []);

  const addRow = () => setRows((r) => [...r, { name: "", contact_method: "" }]);
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<ContactRow>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="mb-3 text-sm font-medium text-gray-700">担当者</div>

      {rows.length === 0 && (
        <p className="mb-3 text-xs text-muted-fg">
          「担当者を追加」で、担当者名と連絡手段（メール／Slack 等）を登録できます。
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`contact_name_${idx}`}>担当者名</Label>
                <Input
                  id={`contact_name_${idx}`}
                  value={row.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`contact_method_${idx}`}>連絡手段</Label>
                <Input
                  id={`contact_method_${idx}`}
                  value={row.contact_method}
                  onChange={(e) => update(idx, { contact_method: e.target.value })}
                  placeholder="例: taro@example.com / Slack"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="mt-6 rounded p-1.5 text-muted-fg hover:bg-gray-100 hover:text-alert"
              aria-label="この担当者を削除"
              title="削除"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Plus className="h-4 w-4" />
        担当者を追加
      </button>

      <input type="hidden" name="contacts" value={JSON.stringify(rows)} />
    </div>
  );
}
