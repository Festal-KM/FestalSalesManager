"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { resetPassword, type ResetState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPassword, initial);

  if (state.ok) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>パスワードを再設定しました。新しいパスワードでログインしてください。</span>
        </div>
        <Link
          href="/login"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
        >
          ログイン画面へ
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="new_password" required>
          新しいパスワード
        </Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          placeholder="8文字以上"
          autoComplete="new-password"
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="confirm_password" required>
          新しいパスワード（確認）
        </Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" loading={isPending}>
        パスワードを再設定する
      </Button>
    </form>
  );
}
