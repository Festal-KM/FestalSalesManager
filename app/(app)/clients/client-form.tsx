"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { saveClient, deactivateClient, type ClientFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ClientFormData = {
  id: string;
  client_code: string;
  company_name: string;
  address: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  is_active: boolean;
};

const initial: ClientFormState = {};

export function ClientForm({
  mode,
  client,
}: {
  mode: "new" | "edit";
  client?: ClientFormData;
}) {
  const [state, formAction, isPending] = useActionState(saveClient, initial);

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        {mode === "edit" && <input type="hidden" name="id" value={client!.id} />}

        <div>
          <Label>取引先ID</Label>
          <Input
            value={mode === "edit" ? client!.client_code : "（保存時に自動採番されます）"}
            readOnly
            disabled
          />
        </div>

        <div>
          <Label htmlFor="company_name" required>
            会社名
          </Label>
          <Input
            id="company_name"
            name="company_name"
            defaultValue={client?.company_name ?? ""}
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="address">会社所在地</Label>
          <Input id="address" name="address" defaultValue={client?.address ?? ""} />
        </div>

        <div>
          <Label htmlFor="billing_contact_name">請求担当者</Label>
          <Input
            id="billing_contact_name"
            name="billing_contact_name"
            defaultValue={client?.billing_contact_name ?? ""}
          />
        </div>

        <div>
          <Label htmlFor="billing_contact_email">請求担当者メール</Label>
          <Input
            id="billing_contact_email"
            name="billing_contact_email"
            type="email"
            defaultValue={client?.billing_contact_email ?? ""}
          />
        </div>

        {mode === "edit" && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={client!.is_active}
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
