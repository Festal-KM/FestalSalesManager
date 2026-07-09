"use server";

import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, appBaseUrl } from "@/lib/mail";

export type ForgotState = { ok?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TTL_MS = 60 * 60 * 1000; // 1時間

/**
 * パスワード再設定リクエスト。login_id（メールアドレス）宛にリセットリンクを送る。
 * アカウント列挙を防ぐため、存在有無・送信可否にかかわらず常に汎用成功を返す。
 */
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const login_id = String(formData.get("login_id") ?? "").trim();
  if (!login_id) {
    return { error: "ログインID（メールアドレス）を入力してください" };
  }

  // 送信先はメールアドレス。形式が正しいときのみ実際に処理する。
  if (EMAIL_RE.test(login_id)) {
    const user = await prisma.user.findUnique({ where: { login_id } });
    if (user && user.is_active) {
      const token = randomBytes(32).toString("hex");
      const token_hash = createHash("sha256").update(token).digest("hex");
      const expires_at = new Date(Date.now() + TTL_MS);

      // 既存の未使用トークンは無効化してから新規発行
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({
          where: { user_id: user.id, used_at: null },
        }),
        prisma.passwordResetToken.create({
          data: { user_id: user.id, token_hash, expires_at },
        }),
      ]);

      const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(user.login_id, resetUrl);
      } catch (e) {
        // 送信失敗はログのみ（ユーザーには汎用成功を返して存在/失敗を秘匿）
        console.error("[forgot-password] send failed:", e);
      }
    }
  }

  return { ok: true };
}
