"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/auth-helpers";

export type MyMissionState = { error?: string; ok?: boolean };

/** マイページ: 本人の自己記入（自己ミッション・振り返り/進捗）を保存 */
export async function saveMyMission(
  _prev: MyMissionState,
  formData: FormData,
): Promise<MyMissionState> {
  const dbUser = await getCurrentDbUser();
  const member_id = dbUser?.linked_member?.id;
  if (!member_id) return { error: "紐づくメンバーがありません" };

  const fyRaw = String(formData.get("fiscal_year") ?? "").trim();
  const half = Number(String(formData.get("half") ?? "").trim());
  const fiscal_year = Number(fyRaw);
  if (!/^\d{4}$/.test(fyRaw) || (half !== 1 && half !== 2)) {
    return { error: "対象期間が不正です" };
  }

  // 本人が編集できるのは自己記入系のみ（admin_mission は管理者のみ）
  const data = {
    admin_review: String(formData.get("admin_review") ?? "").trim() || null,
    self_mission: String(formData.get("self_mission") ?? "").trim() || null,
    self_review: String(formData.get("self_review") ?? "").trim() || null,
  };

  await prisma.mission.upsert({
    where: { member_id_fiscal_year_half: { member_id, fiscal_year, half } },
    update: data,
    create: { member_id, fiscal_year, half, ...data },
  });

  revalidatePath("/my");
  return { ok: true };
}
