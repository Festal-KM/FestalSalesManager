"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const login_id = String(formData.get("login_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // 要件14-4-3 必須チェック
  if (!login_id || !password) {
    return { error: "IDとパスワードを入力してください" };
  }

  try {
    await signIn("credentials", {
      login_id,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // signIn 成功時は NEXT_REDIRECT を throw するため、それは再 throw する
    if (error instanceof AuthError) {
      return { error: "IDまたはパスワードが違います" };
    }
    throw error;
  }
  return {};
}
