import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminPage } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "取引先一覧 | 成績管理ツール" };

type SP = Promise<{ keyword?: string; active?: string }>;

export default async function ClientsPage({ searchParams }: { searchParams: SP }) {
  await requireAdminPage(); // 一般ユーザーは /my へ
  const user = await getCurrentUser();
  const isAdmin = user?.role === "Admin";
  const sp = await searchParams;
  const keyword = (sp.keyword ?? "").trim();
  const active = sp.active ?? "active_only";

  const clients = await prisma.client.findMany({
    where: {
      ...(active === "active_only"
        ? { is_active: true }
        : active === "inactive_only"
          ? { is_active: false }
          : {}),
      ...(keyword
        ? {
            OR: [
              { company_name: { contains: keyword, mode: "insensitive" } },
              { client_code: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { contacts: { orderBy: { created_at: "asc" } } },
    orderBy: { client_code: "asc" },
  });

  return (
    <div>
      <PageHeader title="取引先一覧" description="取引先の検索・閲覧">
        {isAdmin && (
          <Link href="/clients/new" className={cn(buttonVariants({ variant: "primary" }))}>
            <Plus className="h-4 w-4" />
            取引先登録
          </Link>
        )}
      </PageHeader>

      {/* 検索条件（要件22） */}
      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              キーワード（会社名 / コード）
            </label>
            <Input name="keyword" defaultValue={keyword} placeholder="会社名 または C001" />
          </div>
          <div className="w-40">
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
          <Link
            href="/clients"
            className={cn(buttonVariants({ variant: "back" }))}
          >
            条件クリア
          </Link>
        </form>
      </Card>

      <Card>
        {clients.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>取引先ID</TH>
                <TH>会社名</TH>
                <TH>担当者</TH>
                <TH>連絡手段</TH>
                <TH>状態</TH>
                {isAdmin && <TH>操作</TH>}
              </TR>
            </THead>
            <TBody>
              {clients.map((c) => (
                <TR key={c.id}>
                  <TD className="font-mono text-xs">{c.client_code}</TD>
                  <TD className="font-medium">{c.company_name}</TD>
                  <TD>
                    {c.contacts.length === 0 ? (
                      <span className="text-muted-fg">-</span>
                    ) : (
                      <div className="space-y-0.5">
                        {c.contacts.map((ct) => (
                          <div key={ct.id} className="text-xs font-medium">
                            {ct.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </TD>
                  <TD>
                    {c.contacts.length === 0 ? (
                      <span className="text-muted-fg">-</span>
                    ) : (
                      <div className="space-y-0.5">
                        {c.contacts.map((ct) => (
                          <div key={ct.id} className="text-xs text-muted-fg">
                            {ct.contact_method || "-"}
                          </div>
                        ))}
                      </div>
                    )}
                  </TD>
                  <TD>
                    {c.is_active ? (
                      <Badge variant="success">有効</Badge>
                    ) : (
                      <Badge variant="default">無効</Badge>
                    )}
                  </TD>
                  {isAdmin && (
                    <TD>
                      <Link
                        href={`/clients/${c.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        編集
                      </Link>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
