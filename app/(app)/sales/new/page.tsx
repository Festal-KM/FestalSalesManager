import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { SalesBulkForm } from "../sales-bulk-form";

export const metadata = { title: "売上登録 | 成績管理ツール" };

export default async function NewSalesPage() {
  await requireUser();
  const [members, clients] = await Promise.all([
    prisma.member.findMany({
      where: { is_active: true },
      select: { id: true, member_code: true, name: true },
      orderBy: { member_code: "asc" },
    }),
    prisma.client.findMany({
      where: { is_active: true },
      select: { id: true, client_code: true, company_name: true },
      orderBy: { client_code: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="売上登録" backHref="/sales" />
      <SalesBulkForm members={members} clients={clients} />
    </div>
  );
}
