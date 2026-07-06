import { requireUser } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 未ログインガード（要件11-1）
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-base">
      <Sidebar loginId={user.login_id} role={user.role} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
