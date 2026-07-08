import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../../client-form";

export const metadata = { title: "取引先編集 | 成績管理ツール" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(); // 要件23-2 Admin専用（一般ユーザーは /my へ）
  const { id } = await params;
  const c = await prisma.client.findUnique({
    where: { id },
    include: { contacts: { orderBy: { created_at: "asc" } } },
  });
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
          note: c.note,
          is_active: c.is_active,
          contacts: c.contacts.map((x) => ({
            name: x.name,
            contact_method: x.contact_method ?? "",
          })),
        }}
      />
    </div>
  );
}
