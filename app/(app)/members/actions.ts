"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { nextCode } from "@/lib/numbering";

type EmploymentLit = "Proper" | "Outsource";
type GenderLit = "Male" | "Female" | "Other" | "Unknown";
const GENDERS: GenderLit[] = ["Male", "Female", "Other", "Unknown"];

export type MemberFormState = { error?: string };

/** S31 メンバー登録・編集（Admin専用）。id空=新規 / id有=編集 */
export async function saveMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const employment_type = String(formData.get("employment_type") ?? "");
  const genderRaw = String(formData.get("gender") ?? "");
  const ageRaw = String(formData.get("age") ?? "").trim();
  const linked_user_id = String(formData.get("linked_user_id") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  // 要件20-8 バリデーション
  if (!name) return { error: "必須項目を入力してください" };
  if (employment_type !== "Proper" && employment_type !== "Outsource") {
    return { error: "必須項目を入力してください" };
  }

  let age: number | null = null;
  if (ageRaw !== "") {
    age = Number(ageRaw);
    if (!Number.isFinite(age) || age < 0) {
      return { error: "年齢は0以上で入力してください" };
    }
  }

  const gender: GenderLit | null =
    genderRaw && GENDERS.includes(genderRaw as GenderLit)
      ? (genderRaw as GenderLit)
      : null;

  // 要件20-9 linked_user 重複チェック（DBでも @unique で担保）
  if (linked_user_id) {
    const dup = await prisma.member.findFirst({
      where: { linked_user_id, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    if (dup) return { error: "このユーザーは既に他のメンバーに紐付いています" };
  }

  const data = {
    name,
    age,
    gender,
    employment_type: employment_type as EmploymentLit,
    linked_user_id: linked_user_id || null,
  };

  if (!id) {
    // 新規: member_code を採番（要件20-10）。is_active=true 固定。
    await prisma.$transaction(async (tx) => {
      const member_code = await nextCode(tx, "MEMBER");
      await tx.member.create({ data: { ...data, member_code, is_active: true } });
    });
  } else {
    // 編集: member_code は更新しない（要件20-11）
    await prisma.member.update({ where: { id }, data: { ...data, is_active } });
  }

  revalidatePath("/members");
  redirect("/members");
}

/** S31 無効化（is_active=false）。要件20-12 */
export async function deactivateMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    await prisma.member.update({ where: { id }, data: { is_active: false } });
  }
  revalidatePath("/members");
  redirect("/members");
}
