import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { MemberForm } from "../member-form";

export const metadata = { title: "メンバー登録 | 成績管理ツール" };

export default async function NewMemberPage() {
  await requireAdmin("/members"); // 要件20-2 Admin専用
  // まだ他メンバーに紐づいていないユーザーのみ選択肢に出す
  const [users, seq] = await Promise.all([
    prisma.user.findMany({
      where: { linked_member: { is: null } },
      select: { id: true, login_id: true },
      orderBy: { login_id: "asc" },
    }),
    prisma.numberSequence.findUnique({ where: { seq_key: "MEMBER" } }),
  ]);

  // 次の採番候補（例: 0010）。フォームで変更可能。
  const suggestedCode = seq
    ? String(seq.current_no + 1).padStart(seq.pad_digits, "0")
    : "";

  return (
    <div>
      <PageHeader title="メンバー登録" backHref="/members" />
      <MemberForm mode="new" users={users} suggestedCode={suggestedCode} />
    </div>
  );
}
