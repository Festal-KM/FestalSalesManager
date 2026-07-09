import { ForgotForm } from "./forgot-form";

export const metadata = { title: "パスワード再設定 | Festal Sales Manager" };

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base px-4">
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
          <div className="eyebrow text-brand">Password reset</div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-ink">
            パスワード再設定
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            登録済みのメールアドレスに再設定リンクを送ります
          </p>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(11,31,94,0.04),0_8px_30px_rgba(11,31,94,0.08)]">
          <ForgotForm />
        </div>
      </div>
    </div>
  );
}
