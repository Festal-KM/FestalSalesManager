import { requireAdmin } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../client-form";

export const metadata = { title: "取引先登録 | 成績管理ツール" };

export default async function NewClientPage() {
  await requireAdmin("/clients"); // 要件23-2 Admin専用
  return (
    <div>
      <PageHeader title="取引先登録" backHref="/clients" />
      <ClientForm mode="new" />
    </div>
  );
}
