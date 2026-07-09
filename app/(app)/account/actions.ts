"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const MIN_PW = 8;

export type PasswordChangeState = { error?: string; ok?: boolean };

/** マイページ: 本人が自分のログインパスワードを変更する（現パスワード確認あり） */
export async function changeMyPassword(
  _prev: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const sessionUser = await requireUser();

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !next || !confirm) {
    return { error: "すべての項目を入力してください" };
  }
  if (next.length < MIN_PW) {
    return { error: `新しいパスワードは${MIN_PW}文字以上で入力してください` };
  }
  if (next !== confirm) {
    return { error: "確認用パスワードが一致しません" };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return { error: "ユーザーが見つかりません" };

  const ok = await bcrypt.compare(current, user.login_pw);
  if (!ok) return { error: "現在のパスワードが正しくありません" };

  const same = await bcrypt.compare(next, user.login_pw);
  if (same) return { error: "現在と異なるパスワードを設定してください" };

  const login_pw = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: user.id }, data: { login_pw } });

  return { ok: true };
}
