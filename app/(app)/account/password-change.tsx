"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { changeMyPassword, type PasswordChangeState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: PasswordChangeState = {};

export function PasswordChange() {
  const [state, formAction, isPending] = useActionState(changeMyPassword, initial);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  // 成功したら入力欄をクリア
  useEffect(() => {
    if (state.ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }, [state.ok]);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="current_password" required>
          現在のパスワード
        </Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div>
        <Label htmlFor="new_password" required>
          新しいパスワード
        </Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="8文字以上"
          autoComplete="new-password"
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
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>パスワードを変更しました。</span>
        </div>
      )}

      <Button type="submit" loading={isPending}>
        パスワードを変更する
      </Button>
    </form>
  );
}
