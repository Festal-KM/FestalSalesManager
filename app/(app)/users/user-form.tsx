"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import { saveUser, deactivateUser, type UserFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/enums";

export type UserFormData = {
  id: string;
  login_id: string;
  role: string;
  is_active: boolean;
  linked_member_label: string | null;
  is_self: boolean;
};

const initial: UserFormState = {};

export function UserForm({
  mode,
  user,
}: {
  mode: "new" | "edit";
  user?: UserFormData;
}) {
  const [state, formAction, isPending] = useActionState(saveUser, initial);

  const [loginId, setLoginId] = useState(user?.login_id ?? "");
  const [role, setRole] = useState(user?.role ?? "User");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        {mode === "edit" && <input type="hidden" name="id" value={user!.id} />}

        <div>
          <Label htmlFor="login_id" required>
            ログインID
          </Label>
          <Input
            id="login_id"
            name="login_id"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="例: yamada"
            autoComplete="off"
            className="w-64"
          />
          <p className="mt-1 text-xs text-muted-fg">
            ログイン画面で入力するIDです。半角英数字を推奨します。
          </p>
        </div>

        <div>
          <Label htmlFor="password" required={mode === "new"}>
            パスワード
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "edit" ? "変更する場合のみ入力" : "8文字以上"}
            autoComplete="new-password"
            className="w-64"
          />
          <p className="mt-1 text-xs text-muted-fg">
            {mode === "edit"
              ? "空欄のままにすると現在のパスワードを維持します。"
              : "8文字以上で設定してください。"}
          </p>
        </div>

        <div>
          <Label htmlFor="role" required>
            役割
          </Label>
          <Select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-64"
          >
            <option value="User">{ROLE_LABELS.User}</option>
            <option value="Admin">{ROLE_LABELS.Admin}</option>
          </Select>
          <p className="mt-1 text-xs text-muted-fg">
            管理者は全機能、一般ユーザーは個人実績表のみ利用できます。
          </p>
        </div>

        {mode === "edit" && (
          <>
            <div>
              <Label>紐づくメンバー</Label>
              <p className="text-sm text-gray-900">
                {user!.linked_member_label ?? "（紐づけなし）"}
              </p>
              <p className="mt-1 text-xs text-muted-fg">
                メンバーとの紐づけは「メンバー一覧」の編集画面から行います。
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={user!.is_self}
                className="h-4 w-4 rounded border-gray-300"
              />
              有効
              {user!.is_self && (
                <span className="text-xs text-muted-fg">
                  （自分自身は無効化できません）
                </span>
              )}
            </label>
          </>
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
            href="/users"
            className="inline-flex h-10 items-center rounded-md bg-backbtn px-4 text-sm font-medium text-backbtn-fg hover:bg-backbtn-hover hover:text-backbtn-fg-hover"
          >
            キャンセル
          </Link>
        </div>
      </form>

      {mode === "edit" && user!.is_active && !user!.is_self && (
        <form action={deactivateUser} className="border-t border-gray-100 pt-4">
          <input type="hidden" name="id" value={user!.id} />
          <Button type="submit" variant="destructive">
            このユーザーを無効化する
          </Button>
        </form>
      )}
    </div>
  );
}
