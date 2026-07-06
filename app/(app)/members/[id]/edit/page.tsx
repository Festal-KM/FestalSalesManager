import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { MemberForm } from "../../member-form";

export const metadata = { title: "メンバー編集 | 成績管理ツール" };

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/members"); // 要件20-2 Admin専用
  const { id } = await params;
  const m = await prisma.member.findUnique({ where: { id } });
  if (!m) redirect("/members");

  // 未紐づけユーザー + 現在紐づいているユーザー
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { linked_member: { is: null } },
        ...(m.linked_user_id ? [{ id: m.linked_user_id }] : []),
      ],
    },
    select: { id: true, login_id: true },
    orderBy: { login_id: "asc" },
  });

  return (
    <div>
      <PageHeader title="メンバー編集" backHref="/members" />
      <MemberForm
        mode="edit"
        users={users}
        member={{
          id: m.id,
          member_code: m.member_code,
          name: m.name,
          age: m.age,
          gender: m.gender,
          employment_type: m.employment_type,
          linked_user_id: m.linked_user_id,
          is_active: m.is_active,
        }}
      />
    </div>
  );
}
