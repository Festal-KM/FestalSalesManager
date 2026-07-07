import { redirect } from "next/navigation";
import { requireUser, getCurrentDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { SalesForm } from "../../sales-form";
import { toMonthInputValue } from "@/lib/date";

export const metadata = { title: "売上編集 | 成績管理ツール" };

export default async function EditSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const entry = await prisma.salesEntry.findUnique({
    where: { id },
    include: { expenses: { orderBy: { created_at: "asc" } } },
  });
  // 要件18-5 削除済み/存在しない場合は一覧へ
  if (!entry || entry.is_deleted) redirect("/sales");

  // User は自分の売上のみ編集可（要件16-7 / 18）
  const isAdmin = user.role === "Admin";
  if (!isAdmin) {
    const dbUser = await getCurrentDbUser();
    if (dbUser?.linked_member?.id !== entry.member_id) redirect("/sales");
  }

  const [members, clients] = await Promise.all([
    prisma.member.findMany({
      where: { OR: [{ is_active: true }, { id: entry.member_id }] },
      select: { id: true, member_code: true, name: true },
      orderBy: { member_code: "asc" },
    }),
    prisma.client.findMany({
      where: { OR: [{ is_active: true }, { id: entry.client_id }] },
      select: { id: true, client_code: true, company_name: true },
      orderBy: { client_code: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="売上編集" backHref="/sales" />
      <SalesForm
        mode="edit"
        members={members}
        clients={clients}
        canDelete={isAdmin}
        entry={{
          id: entry.id,
          member_id: entry.member_id,
          client_id: entry.client_id,
          period_month: toMonthInputValue(entry.period_month),
          amount: entry.amount.toString(),
          status: entry.status,
          memo: entry.memo,
          expenses: entry.expenses.map((e) => ({
            type: e.type,
            amount: e.amount.toString(),
            note: e.note ?? "",
          })),
        }}
      />
    </div>
  );
}
