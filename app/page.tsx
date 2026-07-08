import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";

export default async function Home() {
  // 未ログインは /login、管理者はダッシュボード、一般ユーザーは個人実績へ
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === "Admin" ? "/dashboard" : "/my");
}
