import Link from "next/link";
import { Plus, Pencil, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EMPLOYMENT_LABELS, GENDER_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata = { title: "メンバー一覧 | 成績管理ツール" };

type SP = Promise<{ keyword?: string; employment?: string; active?: string }>;

export default async function MembersPage({ searchParams }: { searchParams: SP }) {
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
        ? keyword.startsWith("M-")
          ? { member_code: { contains: keyword, mode: "insensitive" } }
          : { name: { contains: keyword, mode: "insensitive" } }
        : {}),
    },
    include: { linked_user: { select: { login_id: true } } },
    orderBy: { member_code: "asc" },
  });

  return (
    <div>
      <PageHeader title="メンバー一覧" description="メンバーの検索・閲覧">
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
              キーワード（氏名 / M-コード）
            </label>
            <Input name="keyword" defaultValue={keyword} placeholder="氏名 または M-000001" />
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
          <Table>
            <THead>
              <TR>
                <TH>メンバーID</TH>
                <TH>氏名</TH>
                <TH>年齢</TH>
                <TH>性別</TH>
                <TH>雇用区分</TH>
                <TH>ログインユーザー</TH>
                <TH>状態</TH>
                <TH>操作</TH>
              </TR>
            </THead>
            <TBody>
              {members.map((m) => (
                <TR key={m.id}>
                  <TD className="font-mono text-xs">{m.member_code}</TD>
                  <TD className="font-medium">{m.name}</TD>
                  <TD>{m.age ?? "-"}</TD>
                  <TD>{m.gender ? GENDER_LABELS[m.gender] : "-"}</TD>
                  <TD>
                    <Badge variant={m.employment_type === "Proper" ? "brand" : "light"}>
                      {EMPLOYMENT_LABELS[m.employment_type]}
                    </Badge>
                  </TD>
                  <TD className="text-muted-fg">{m.linked_user?.login_id ?? "-"}</TD>
                  <TD>
                    {m.is_active ? (
                      <Badge variant="success">有効</Badge>
                    ) : (
                      <Badge variant="default">無効</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex gap-1.5">
                      <Link
                        href={`/members/${m.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        詳細
                      </Link>
                      {isAdmin && (
                        <Link
                          href={`/members/${m.id}/edit`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          編集
                        </Link>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
