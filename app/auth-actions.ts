"use server";

import { signOut } from "@/auth";

/** ログアウト処理（S01）→ S00 へ */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
