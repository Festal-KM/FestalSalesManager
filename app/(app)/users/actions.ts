"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

type RoleLit = "Admin" | "User";
const MIN_PW = 8;

export type UserFormState = { error?: string };

/** ログインユーザー登録・編集（Admin専用）。id空=新規 / id有=編集 */
export async function saveUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const login_id = String(formData.get("login_id") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");
  const is_active = formData.get("is_active") === "on";

  // バリデーション
  if (!login_id) return { error: "ログインIDを入力してください" };
  if (roleRaw !== "Admin" && roleRaw !== "User") {
    return { error: "役割を選択してください" };
  }
  const role = roleRaw as RoleLit;

  // パスワード: 新規は必須、編集は入力があった場合のみ変更
  const wantsPassword = !id || password !== "";
  if (wantsPassword && password.length < MIN_PW) {
    return { error: `パスワードは${MIN_PW}文字以上で入力してください` };
  }

  // ログインID 重複チェック（DBでも @unique で担保）
  const dup = await prisma.user.findFirst({
    where: { login_id, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (dup) return { error: "このログインIDは既に使われています" };

  if (!id) {
    const login_pw = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { login_id, login_pw, role, is_active: true },
    });
  } else {
    // 自分自身の締め出し防止: 権限降格・無効化は不可
    if (id === admin.id) {
      if (role !== "Admin") {
        return { error: "自分自身の管理者権限は変更できません" };
      }
      if (!is_active) {
        return { error: "自分自身を無効化することはできません" };
      }
    }
    const data: {
      login_id: string;
      role: RoleLit;
      is_active: boolean;
      login_pw?: string;
    } = { login_id, role, is_active };
    if (wantsPassword) {
      data.login_pw = await bcrypt.hash(password, 10);
    }
    await prisma.user.update({ where: { id }, data });
  }

  revalidatePath("/users");
  redirect("/users");
}

/** 無効化（is_active=false）。自分自身は不可。 */
export async function deactivateUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (id && id !== admin.id) {
    await prisma.user.update({ where: { id }, data: { is_active: false } });
  }
  revalidatePath("/users");
  redirect("/users");
}
