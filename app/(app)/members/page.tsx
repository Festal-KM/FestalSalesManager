import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminPage } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EMPLOYMENT_LABELS } from "@/lib/enums";
import { formatYen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MembersTable } from "./members-table";

export const metadata = { title: "メンバー一覧 | 成績管理ツール" };

type SP = Promise<{ keyword?: string; employment?: string; active?: string }>;

export default async function MembersPage({ searchParams }: { searchParams: SP }) {
  await requireAdminPage(); // 一般ユーザーは /my へ
  const user = await getCurrentUser();
  const isAdmin = user?.role === "Admin";
  const sp = await searchParams;
  const keyword = (sp.keyword ?? "").trim();
  const employment = sp.employment ?? "all";
  const active = sp.active ?? "active_only";

  const members = await prisma.member.findMany({
    where: {
      ...(active === "active_only"
        ? { is_active: true }
        : active === "inactive_only"
          ? { is_active: false }
          : {}),
      ...(employment === "Proper" || employment === "Outsource"
        ? { employment_type: employment }
        : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: "insensitive" } },
              { member_code: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { linked_user: { select: { login_id: true } } },
    orderBy: { member_code: "asc" },
  });

  return (
    <div>
      <PageHeader eyebrow="Members" title="メンバー一覧" description="メンバーの検索・閲覧">
        {isAdmin && (
          <Link href="/members/new" className={cn(buttonVariants({ variant: "primary" }))}>
            <Plus className="h-4 w-4" />
            メンバー登録
          </Link>
        )}
      </PageHeader>

      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              キーワード（氏名 / コード）
            </label>
            <Input name="keyword" defaultValue={keyword} placeholder="氏名 または 0001" />
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-gray-600">雇用区分</label>
            <Select name="employment" defaultValue={employment}>
              <option value="all">すべて</option>
              <option value="Proper">{EMPLOYMENT_LABELS.Proper}</option>
              <option value="Outsource">{EMPLOYMENT_LABELS.Outsource}</option>
            </Select>
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-gray-600">状態</label>
            <Select name="active" defaultValue={active}>
              <option value="active_only">有効のみ</option>
              <option value="inactive_only">無効のみ</option>
              <option value="all">すべて</option>
            </Select>
          </div>
          <Button type="submit" variant="light">
            検索
          </Button>
          <Link href="/members" className={cn(buttonVariants({ variant: "back" }))}>
            条件クリア
          </Link>
        </form>
      </Card>

      <Card>
        {members.length === 0 ? (
          <EmptyState />
        ) : (
          <MembersTable
            isAdmin={isAdmin}
            members={members.map((m) => ({
              id: m.id,
              member_code: m.member_code,
              name: m.name,
              age: m.age,
              gender: m.gender,
              position: m.position,
              department: m.department,
              employment_type: m.employment_type,
              affiliation: m.affiliation,
              purchase_unit_price: m.purchase_unit_price
                ? formatYen(m.purchase_unit_price.toString())
                : null,
              login_id: m.linked_user?.login_id ?? null,
              is_active: m.is_active,
            }))}
          />
        )}
      </Card>
    </div>
  );
}
