"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { saveMember, deactivateMember, type MemberFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { GENDER_OPTIONS, EMPLOYMENT_OPTIONS } from "@/lib/enums";

export type MemberFormData = {
  id: string;
  member_code: string;
  name: string;
  age: number | null;
  gender: string | null;
  employment_type: string;
  linked_user_id: string | null;
  is_active: boolean;
};

export type UserOption = { id: string; login_id: string };

const initial: MemberFormState = {};

export function MemberForm({
  mode,
  member,
  users,
}: {
  mode: "new" | "edit";
  member?: MemberFormData;
  users: UserOption[];
}) {
  const [state, formAction, isPending] = useActionState(saveMember, initial);

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        {mode === "edit" && <input type="hidden" name="id" value={member!.id} />}

        <div>
          <Label>メンバーID</Label>
          <Input
            value={mode === "edit" ? member!.member_code : "（保存時に自動採番されます）"}
            readOnly
            disabled
          />
        </div>

        <div>
          <Label htmlFor="name" required>
            氏名
          </Label>
          <Input id="name" name="name" defaultValue={member?.name ?? ""} autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="age">年齢</Label>
            <Input
              id="age"
              name="age"
              type="number"
              min={0}
              defaultValue={member?.age ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="gender">性別</Label>
            <Select id="gender" name="gender" defaultValue={member?.gender ?? ""}>
              <option value="">（未選択）</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="employment_type" required>
            雇用区分
          </Label>
          <Select
            id="employment_type"
            name="employment_type"
            defaultValue={member?.employment_type ?? ""}
          >
            <option value="">（選択してください）</option>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="linked_user_id">ログインユーザー紐づけ</Label>
          <Select
            id="linked_user_id"
            name="linked_user_id"
            defaultValue={member?.linked_user_id ?? ""}
          >
            <option value="">（紐づけなし）</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.login_id}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted-fg">
            1ユーザーにつき1メンバーまで紐づけできます。
          </p>
        </div>

        {mode === "edit" && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={member!.is_active}
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
            href="/members"
            className="inline-flex h-10 items-center rounded-md bg-backbtn px-4 text-sm font-medium text-backbtn-fg hover:bg-backbtn-hover hover:text-backbtn-fg-hover"
          >
            キャンセル
          </Link>
        </div>
      </form>

      {mode === "edit" && member!.is_active && (
        <form action={deactivateMember} className="border-t border-gray-100 pt-4">
          <input type="hidden" name="id" value={member!.id} />
          <Button type="submit" variant="destructive">
            このメンバーを無効化する
          </Button>
        </form>
      )}
    </div>
  );
}
