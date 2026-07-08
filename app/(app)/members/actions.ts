"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

type EmploymentLit = "Proper" | "Outsource";
type GenderLit = "Male" | "Female" | "Other" | "Unknown";
const GENDERS: GenderLit[] = ["Male", "Female", "Other", "Unknown"];

export type MemberFormState = { error?: string };

/** メンバーコードを正規化（数字のみなら4桁ゼロ埋め） */
function normalizeMemberCode(raw: string): string {
  const v = raw.trim();
  return /^\d+$/.test(v) ? v.padStart(4, "0") : v;
}

/** S31 メンバー登録・編集（Admin専用）。id空=新規 / id有=編集 */
export async function saveMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const member_code = normalizeMemberCode(String(formData.get("member_code") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const employment_type = String(formData.get("employment_type") ?? "");
  const genderRaw = String(formData.get("gender") ?? "");
  const ageRaw = String(formData.get("age") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const priceRaw = String(formData.get("purchase_unit_price") ?? "").trim();
  const linked_user_id = String(formData.get("linked_user_id") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  // 要件20-8 バリデーション
  if (!name || !member_code) return { error: "必須項目を入力してください" };
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

  const isOutsource = employment_type === "Outsource";
  let purchase_unit_price: string | null = null;
  if (isOutsource && priceRaw !== "") {
    const p = Number(priceRaw);
    if (!Number.isFinite(p) || p < 0) {
      return { error: "仕入単価は0以上で入力してください" };
    }
    purchase_unit_price = priceRaw;
  }

  const gender: GenderLit | null =
    genderRaw && GENDERS.includes(genderRaw as GenderLit)
      ? (genderRaw as GenderLit)
      : null;

  // メンバーコード重複チェック（@unique でも担保）
  const codeDup = await prisma.member.findFirst({
    where: { member_code, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (codeDup) return { error: "このメンバーコードは既に使われています" };

  // 要件20-9 linked_user 重複チェック（DBでも @unique で担保）
  if (linked_user_id) {
    const dup = await prisma.member.findFirst({
      where: { linked_user_id, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    if (dup) return { error: "このユーザーは既に他のメンバーに紐付いています" };
  }

  const data = {
    member_code,
    name,
    age,
    gender,
    employment_type: employment_type as EmploymentLit,
    position: position || null,
    department: department || null,
    // 外注のみ 所属・仕入単価を保持（プロパーは空に）
    affiliation: isOutsource ? affiliation || null : null,
    purchase_unit_price: isOutsource ? purchase_unit_price : null,
    linked_user_id: linked_user_id || null,
  };

  if (!id) {
    await prisma.$transaction(async (tx) => {
      await tx.member.create({ data: { ...data, is_active: true } });
      // 採番の現在値を、使ったコード以上に進める（次の候補が被らないように）
      if (/^\d+$/.test(member_code)) {
        const seq = await tx.numberSequence.findUnique({
          where: { seq_key: "MEMBER" },
          select: { current_no: true },
        });
        const used = parseInt(member_code, 10);
        if (seq && used > seq.current_no) {
          await tx.numberSequence.update({
            where: { seq_key: "MEMBER" },
            data: { current_no: used },
          });
        }
      }
    });
  } else {
    await prisma.member.update({ where: { id }, data: { ...data, is_active } });
  }

  revalidatePath("/members");
  redirect("/members");
}

export type AdminMissionState = { error?: string; ok?: boolean };

/** 管理者が課すミッションを設定（メンバー×会計年度×半期）。Admin専用 */
export async function saveAdminMission(
  _prev: AdminMissionState,
  formData: FormData,
): Promise<AdminMissionState> {
  await requireAdmin();

  const member_id = String(formData.get("member_id") ?? "").trim();
  const fyRaw = String(formData.get("fiscal_year") ?? "").trim();
  const half = Number(String(formData.get("half") ?? "").trim());
  const fiscal_year = Number(fyRaw);
  if (!member_id || !/^\d{4}$/.test(fyRaw) || (half !== 1 && half !== 2)) {
    return { error: "入力内容を確認してください" };
  }
  const admin_mission =
    String(formData.get("admin_mission") ?? "").trim() || null;

  await prisma.mission.upsert({
    where: { member_id_fiscal_year_half: { member_id, fiscal_year, half } },
    update: { admin_mission },
    create: { member_id, fiscal_year, half, admin_mission },
  });

  revalidatePath(`/members/${member_id}/edit`);
  revalidatePath("/my");
  return { ok: true };
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
