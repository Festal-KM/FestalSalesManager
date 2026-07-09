import { requireAdminPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { suggestSmallestFreeCode } from "@/lib/numbering";
import { MemberForm } from "../member-form";

export const metadata = { title: "メンバー登録 | 成績管理ツール" };

export default async function NewMemberPage() {
  await requireAdminPage(); // 要件20-2 Admin専用（一般ユーザーは /my へ）
  // まだ他メンバーに紐づいていないユーザーのみ選択肢に出す
  const [users, seq, members] = await Promise.all([
    prisma.user.findMany({
      where: { linked_member: { is: null } },
      select: { id: true, login_id: true },
      orderBy: { login_id: "asc" },
    }),
    prisma.numberSequence.findUnique({ where: { seq_key: "MEMBER" } }),
    prisma.member.findMany({ select: { member_code: true } }),
  ]);

  // 空いている最小の番号を採番候補に（例: 0010 のみ使用中なら 0001）。フォームで変更可能。
  const suggestedCode = seq
    ? suggestSmallestFreeCode(
        members.map((m) => m.member_code),
        seq.prefix,
        seq.pad_digits,
      )
    : "";

  return (
    <div>
      <PageHeader title="メンバー登録" backHref="/members" />
      <MemberForm mode="new" users={users} suggestedCode={suggestedCode} />
    </div>
  );
}
