"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import { saveClient, deactivateClient, type ClientFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactRows, type ContactRow } from "./contact-rows";

export type ClientFormData = {
  id: string;
  client_code: string;
  company_name: string;
  note: string | null;
  is_active: boolean;
  contacts: ContactRow[];
};

const initial: ClientFormState = {};

export function ClientForm({
  mode,
  client,
  suggestedCode,
}: {
  mode: "new" | "edit";
  client?: ClientFormData;
  suggestedCode?: string;
}) {
  const [state, formAction, isPending] = useActionState(saveClient, initial);

  const [clientCode, setClientCode] = useState(
    client?.client_code ?? suggestedCode ?? "",
  );
  const [companyName, setCompanyName] = useState(client?.company_name ?? "");
  const [note, setNote] = useState(client?.note ?? "");
  const [isActive, setIsActive] = useState(client?.is_active ?? true);

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        {mode === "edit" && <input type="hidden" name="id" value={client!.id} />}

        <div>
          <Label htmlFor="client_code" required>
            取引先ID
          </Label>
          <Input
            id="client_code"
            name="client_code"
            value={clientCode}
            onChange={(e) => setClientCode(e.target.value)}
            placeholder="C001"
            className="w-40"
          />
          <p className="mt-1 text-xs text-muted-fg">
            C＋3桁の数字（自動採番されますが変更できます）。
          </p>
        </div>

        <div>
          <Label htmlFor="company_name" required>
            会社名
          </Label>
          <Input
            id="company_name"
            name="company_name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoFocus
          />
        </div>

        {/* 担当者（複数・＋で追加） */}
        <ContactRows initial={client?.contacts} />

        <div>
          <Label htmlFor="note">備考</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {mode === "edit" && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            有効
          </label>
        )}

        {state.error && (
          <div className="flex items-center gap-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" loading={isPending}>
            保存
          </Button>
          <Link
            href="/clients"
            className="inline-flex h-10 items-center rounded-md bg-backbtn px-4 text-sm font-medium text-backbtn-fg hover:bg-backbtn-hover hover:text-backbtn-fg-hover"
          >
            キャンセル
          </Link>
        </div>
      </form>

      {/* 無効化（編集時のみ） */}
      {mode === "edit" && client!.is_active && (
        <form action={deactivateClient} className="border-t border-gray-100 pt-4">
          <input type="hidden" name="id" value={client!.id} />
          <Button type="submit" variant="destructive">
            この取引先を無効化する
          </Button>
        </form>
      )}
    </div>
  );
}
