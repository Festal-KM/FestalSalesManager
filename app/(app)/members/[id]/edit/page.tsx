import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { MemberForm } from "../../member-form";

export const metadata = { title: "メンバー編集 | 成績管理ツール" };

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(); // 要件20-2 Admin専用（一般ユーザーは /my へ）
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
      <PageHeader
        title="メンバー編集"
        description="ミッションの設定は「個人実績表」から行います"
        backHref="/members"
      />
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
          position: m.position,
          department: m.department,
          grade: m.grade,
          pitch: m.pitch,
          affiliation: m.affiliation,
          purchase_unit_price: m.purchase_unit_price
            ? m.purchase_unit_price.toString()
            : null,
          linked_user_id: m.linked_user_id,
          is_active: m.is_active,
        }}
      />
    </div>
  );
}
