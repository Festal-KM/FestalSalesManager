import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン | 成績管理ツール" };

export default async function LoginPage() {
  // 要件14-4-1 すでにログイン済みなら S10 へ
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-brand-dark">成績管理ツール</h1>
          <p className="mt-1 text-sm text-muted-fg">社内メンバー向けログイン</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
