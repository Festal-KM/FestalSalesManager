import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** セッションのユーザー（{id, login_id, role}）。未ログインなら null */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** 未ログインなら S00 へリダイレクト。ログイン済みならユーザーを返す */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Admin でなければ redirectTo へ。要件11-2 / 20-2 / 23-2 */
export async function requireAdmin(redirectTo = "/dashboard") {
  const user = await requireUser();
  if (user.role !== "Admin") redirect(redirectTo);
  return user;
}

/** Admin 判定（UI 出し分け用） */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "Admin";
}

/** linked_member 込みの DB ユーザー（User スコープ絞り込み用） */
export async function getCurrentDbUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.user.findUnique({
    where: { id: user.id },
    include: { linked_member: true },
  });
}
