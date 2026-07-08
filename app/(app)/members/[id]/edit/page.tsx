import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { currentFiscalYear, currentFiscalHalf } from "@/lib/date";
import { MemberForm } from "../../member-form";
import { AdminMissionForm } from "../admin-mission-form";

export const metadata = { title: "メンバー編集 | 成績管理ツール" };

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/members"); // 要件20-2 Admin専用
  const { id } = await params;
  const m = await prisma.member.findUnique({
    where: { id },
    include: { missions: true },
  });
  if (!m) redirect("/members");

  const curFy = currentFiscalYear();
  const missionYears = Array.from({ length: 7 }, (_, i) => curFy + 1 - i);

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
          position: m.position,
          department: m.department,
          affiliation: m.affiliation,
          purchase_unit_price: m.purchase_unit_price
            ? m.purchase_unit_price.toString()
            : null,
          linked_user_id: m.linked_user_id,
          is_active: m.is_active,
        }}
      />

      <Card className="mt-6 max-w-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            ミッション（管理者から）
          </h2>
          <p className="mt-0.5 text-xs text-muted-fg">
            会計年度・半期を選んで、このメンバーに課すミッションを設定します。
          </p>
        </div>
        <CardContent>
          <AdminMissionForm
            memberId={m.id}
            years={missionYears}
            defaultFy={curFy}
            defaultHalf={currentFiscalHalf()}
            missions={m.missions.map((x) => ({
              fiscal_year: x.fiscal_year,
              half: x.half,
              admin_mission: x.admin_mission,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
