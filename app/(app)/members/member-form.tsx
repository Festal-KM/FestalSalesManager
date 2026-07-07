"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
  position: string | null;
  department: string | null;
  affiliation: string | null;
  purchase_unit_price: string | null;
  linked_user_id: string | null;
  is_active: boolean;
};

export type UserOption = { id: string; login_id: string };

const initial: MemberFormState = {};

export function MemberForm({
  mode,
  member,
  users,
  suggestedCode,
}: {
  mode: "new" | "edit";
  member?: MemberFormData;
  users: UserOption[];
  suggestedCode?: string;
}) {
  const [state, formAction, isPending] = useActionState(saveMember, initial);

  // 入力は制御コンポーネントで保持（送信後の自動リセット・エラー時の消失を防ぐ）
  const [memberCode, setMemberCode] = useState(
    member?.member_code ?? suggestedCode ?? "",
  );
  const [name, setName] = useState(member?.name ?? "");
  const [age, setAge] = useState(member?.age != null ? String(member.age) : "");
  const [gender, setGender] = useState(member?.gender ?? "");
  const [employment, setEmployment] = useState(member?.employment_type ?? "");
  const [position, setPosition] = useState(member?.position ?? "");
  const [department, setDepartment] = useState(member?.department ?? "");
  const [affiliation, setAffiliation] = useState(member?.affiliation ?? "");
  const [price, setPrice] = useState(member?.purchase_unit_price ?? "");
  const [linkedUserId, setLinkedUserId] = useState(member?.linked_user_id ?? "");
  const [isActive, setIsActive] = useState(member?.is_active ?? true);

  const isOutsource = employment === "Outsource";

  return (
    <div className="max-w-xl space-y-4">
      <form action={formAction} className="space-y-4">
        {mode === "edit" && <input type="hidden" name="id" value={member!.id} />}

        <div>
          <Label htmlFor="member_code" required>
            メンバーコード
          </Label>
          <Input
            id="member_code"
            name="member_code"
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value)}
            placeholder="0001"
            className="w-40"
          />
          <p className="mt-1 text-xs text-muted-fg">
            4桁の数字（自動採番されますが変更できます）。
          </p>
        </div>

        <div>
          <Label htmlFor="name" required>
            氏名
          </Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="age">年齢</Label>
            <Input
              id="age"
              name="age"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="gender">性別</Label>
            <Select
              id="gender"
              name="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">（未選択）</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="position">役職</Label>
            <Input
              id="position"
              name="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="department">部署</Label>
            <Input
              id="department"
              name="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="employment_type" required>
            雇用区分
          </Label>
          <Select
            id="employment_type"
            name="employment_type"
            value={employment}
            onChange={(e) => setEmployment(e.target.value)}
          >
            <option value="">（選択してください）</option>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {/* 外注のみ 所属・仕入単価 */}
        {isOutsource && (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-gray-200 p-3">
            <div>
              <Label htmlFor="affiliation">所属</Label>
              <Input
                id="affiliation"
                name="affiliation"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="purchase_unit_price">仕入単価（円）</Label>
              <Input
                id="purchase_unit_price"
                name="purchase_unit_price"
                inputMode="numeric"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="linked_user_id">ログインユーザー紐づけ</Label>
          <Select
            id="linked_user_id"
            name="linked_user_id"
            value={linkedUserId}
            onChange={(e) => setLinkedUserId(e.target.value)}
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
