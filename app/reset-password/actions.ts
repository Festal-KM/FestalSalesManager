"use server";

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type ResetState = { ok?: boolean; error?: string };

const MIN_PW = 8;

/** リセットトークンを検証し、新しいパスワードを設定する（単回使用・期限切れ不可）。 */
export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!token) {
    return { error: "リンクが無効です。お手数ですが再度お手続きください。" };
  }
  if (next.length < MIN_PW) {
    return { error: `パスワードは${MIN_PW}文字以上で入力してください` };
  }
  if (next !== confirm) {
    return { error: "確認用パスワードが一致しません" };
  }

  const token_hash = createHash("sha256").update(token).digest("hex");
  const rec = await prisma.passwordResetToken.findUnique({
    where: { token_hash },
  });
  if (!rec || rec.used_at || rec.expires_at.getTime() < Date.now()) {
    return {
      error: "リンクが無効か、有効期限が切れています。お手数ですが再度お手続きください。",
    };
  }

  const login_pw = await bcrypt.hash(next, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.user_id }, data: { login_pw } }),
    prisma.passwordResetToken.update({
      where: { id: rec.id },
      data: { used_at: new Date() },
    }),
  ]);

  return { ok: true };
}
