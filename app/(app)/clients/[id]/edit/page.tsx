import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../../client-form";

export const metadata = { title: "取引先編集 | 成績管理ツール" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/clients"); // 要件23-2 Admin専用
  const { id } = await params;
  const c = await prisma.client.findUnique({ where: { id } });
  if (!c) redirect("/clients");

  return (
    <div>
      <PageHeader title="取引先編集" backHref="/clients" />
      <ClientForm
        mode="edit"
        client={{
          id: c.id,
          client_code: c.client_code,
          company_name: c.company_name,
          address: c.address,
          billing_contact_name: c.billing_contact_name,
          billing_contact_email: c.billing_contact_email,
          is_active: c.is_active,
        }}
      />
    </div>
  );
}
