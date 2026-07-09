import { redirect } from "next/navigation";
import { getCurrentUser, requireAdminPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { UserForm } from "../../user-form";

export const metadata = { title: "ユーザー編集 | 成績管理ツール" };

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(); // 一般ユーザーは /my へ
  const [{ id }, current] = await Promise.all([params, getCurrentUser()]);

  const user = await prisma.user.findUnique({
    where: { id },
    include: { linked_member: { select: { name: true, member_code: true } } },
  });
  if (!user) redirect("/users");

  return (
    <div>
      <PageHeader title="ユーザー編集" backHref="/users" />
      <UserForm
        mode="edit"
        user={{
          id: user.id,
          login_id: user.login_id,
          role: user.role,
          is_active: user.is_active,
          linked_member_label: user.linked_member
            ? `${user.linked_member.name}（${user.linked_member.member_code}）`
            : null,
          is_self: user.id === current?.id,
        }}
      />
    </div>
  );
}
