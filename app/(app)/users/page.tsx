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
import { ROLE_LABELS } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UsersTable } from "./users-table";

export const metadata = { title: "ユーザー管理 | 成績管理ツール" };

type SP = Promise<{ keyword?: string; role?: string; active?: string }>;

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  await requireAdminPage(); // 一般ユーザーは /my へ
  const [current, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const keyword = (sp.keyword ?? "").trim();
  const role = sp.role ?? "all";
  const active = sp.active ?? "all";

  const users = await prisma.user.findMany({
    where: {
      ...(active === "active_only"
        ? { is_active: true }
        : active === "inactive_only"
          ? { is_active: false }
          : {}),
      ...(role === "Admin" || role === "User" ? { role } : {}),
      ...(keyword
        ? { login_id: { contains: keyword, mode: "insensitive" } }
        : {}),
    },
    include: { linked_member: { select: { name: true, member_code: true } } },
    orderBy: [{ is_active: "desc" }, { login_id: "asc" }],
  });

  return (
    <div>
      <PageHeader eyebrow="Users" title="ユーザー管理" description="ログインユーザーの登録・編集">
        <Link href="/users/new" className={cn(buttonVariants({ variant: "primary" }))}>
          <Plus className="h-4 w-4" />
          アカウント発行
        </Link>
      </PageHeader>

      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              キーワード（ログインID）
            </label>
            <Input name="keyword" defaultValue={keyword} placeholder="ログインID" />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-gray-600">役割</label>
            <Select name="role" defaultValue={role}>
              <option value="all">すべて</option>
              <option value="Admin">{ROLE_LABELS.Admin}</option>
              <option value="User">{ROLE_LABELS.User}</option>
            </Select>
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-gray-600">状態</label>
            <Select name="active" defaultValue={active}>
              <option value="all">すべて</option>
              <option value="active_only">有効のみ</option>
              <option value="inactive_only">無効のみ</option>
            </Select>
          </div>
          <Button type="submit" variant="light">
            検索
          </Button>
          <Link href="/users" className={cn(buttonVariants({ variant: "back" }))}>
            条件クリア
          </Link>
        </form>
      </Card>

      <Card>
        {users.length === 0 ? (
          <EmptyState />
        ) : (
          <UsersTable
            users={users.map((u) => ({
              id: u.id,
              login_id: u.login_id,
              role: u.role,
              is_active: u.is_active,
              linked_member_label: u.linked_member
                ? `${u.linked_member.name}（${u.linked_member.member_code}）`
                : null,
              created_at: formatDate(u.created_at),
              is_self: u.id === current?.id,
            }))}
          />
        )}
      </Card>
    </div>
  );
}
