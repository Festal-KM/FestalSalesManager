"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, MailCheck } from "lucide-react";
import { requestPasswordReset, type ForgotState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ForgotState = {};

export function ForgotForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initial,
  );

  if (state.ok) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            ご入力のメールアドレスが登録されている場合、パスワード再設定用のリンクを送信しました。メールをご確認ください（リンクの有効期限は1時間です）。
          </span>
        </div>
        <Link
          href="/login"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-backbtn px-4 text-sm font-medium text-backbtn-fg hover:bg-backbtn-hover hover:text-backbtn-fg-hover"
        >
          ログイン画面に戻る
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="login_id" required>
          ログインID（メールアドレス）
        </Label>
        <Input
          id="login_id"
          name="login_id"
          type="email"
          autoComplete="username"
          placeholder="you@festal-inc.com"
          autoFocus
        />
        <p className="mt-1 text-xs text-muted-fg">
          登録済みのメールアドレス宛に再設定リンクを送信します。
        </p>
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" loading={isPending}>
        再設定リンクを送信
      </Button>
      <Link
        href="/login"
        className="block text-center text-sm text-brand hover:underline"
      >
        ログイン画面に戻る
      </Link>
    </form>
  );
}
