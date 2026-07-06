import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { MemberForm } from "../member-form";

export const metadata = { title: "メンバー登録 | 成績管理ツール" };

export default async function NewMemberPage() {
  await requireAdmin("/members"); // 要件20-2 Admin専用
  // まだ他メンバーに紐づいていないユーザーのみ選択肢に出す
  const users = await prisma.user.findMany({
    where: { linked_member: { is: null } },
    select: { id: true, login_id: true },
    orderBy: { login_id: "asc" },
  });

  return (
    <div>
      <PageHeader title="メンバー登録" backHref="/members" />
      <MemberForm mode="new" users={users} />
    </div>
  );
}
