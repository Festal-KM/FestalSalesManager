import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata = { title: "パスワード再設定 | Festal Sales Manager" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

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
            新しいパスワードの設定
          </h1>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(11,31,94,0.04),0_8px_30px_rgba(11,31,94,0.08)]">
          {token ? (
            <ResetForm token={token} />
          ) : (
            <div className="space-y-4 text-sm text-muted-fg">
              <p>
                リンクが正しくありません。メールに記載のリンクからアクセスするか、もう一度お手続きください。
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90"
              >
                再設定をやり直す
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
