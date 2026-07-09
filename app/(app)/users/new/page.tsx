import { requireAdminPage } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { UserForm } from "../user-form";

export const metadata = { title: "アカウント発行 | 成績管理ツール" };

export default async function NewUserPage() {
  await requireAdminPage(); // 一般ユーザーは /my へ

  return (
    <div>
      <PageHeader title="アカウント発行" backHref="/users" />
      <UserForm mode="new" />
    </div>
  );
}
