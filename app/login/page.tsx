import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン | Festal Sales Manager" };

export default async function LoginPage() {
  // 要件14-4-1 すでにログイン済みなら S10 へ
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base px-4">
      {/* 青のアンビエント */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, rgba(30,80,210,0.10), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Festal Sales Manager"
              className="h-auto w-80 max-w-full"
            />
          </div>
          <div className="eyebrow text-brand">Welcome back</div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-ink">
            サインイン
          </h1>
          <p className="mt-1 text-sm text-muted-fg">社内メンバー向けログイン</p>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(11,31,94,0.04),0_8px_30px_rgba(11,31,94,0.08)]">
          <LoginForm />
        </div>

        <p className="eyebrow mt-6 text-center text-muted-fg/60">
          Festal Sales Manager
        </p>
      </div>
    </div>
  );
}
