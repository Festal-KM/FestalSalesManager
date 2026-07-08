import { requireAdminPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { SalesBulkForm } from "../sales-bulk-form";

export const metadata = { title: "売上登録 | 成績管理ツール" };

type SP = Promise<{ contract?: string }>;

export default async function NewSalesPage({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const contract =
    sp.contract === "Contract" || sp.contract === "Other"
      ? sp.contract
      : "SemiDelegation";

  const [membersRaw, clients] = await Promise.all([
    prisma.member.findMany({
      where: { is_active: true },
      select: {
        id: true,
        member_code: true,
        name: true,
        employment_type: true,
        purchase_unit_price: true,
      },
      orderBy: { member_code: "asc" },
    }),
    prisma.client.findMany({
      where: { is_active: true },
      select: { id: true, client_code: true, company_name: true },
      orderBy: { client_code: "asc" },
    }),
  ]);

  const members = membersRaw.map((m) => ({
    id: m.id,
    member_code: m.member_code,
    name: m.name,
    employment_type: m.employment_type,
    purchase_unit_price: m.purchase_unit_price
      ? m.purchase_unit_price.toString()
      : null,
  }));

  return (
    <div>
      <PageHeader title="売上登録" backHref="/sales" />
      <SalesBulkForm members={members} clients={clients} contract={contract} />
    </div>
  );
}
