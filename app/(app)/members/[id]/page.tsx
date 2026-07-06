import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EMPLOYMENT_LABELS, GENDER_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";

export const metadata = { title: "メンバー詳細 | 成績管理ツール" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex border-b border-gray-100 py-3 last:border-0">
      <div className="w-40 shrink-0 text-sm text-muted-fg">{label}</div>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "Admin";
  const { id } = await params;
  const m = await prisma.member.findUnique({
    where: { id },
    include: { linked_user: { select: { login_id: true } } },
  });
  if (!m) redirect("/members");

  return (
    <div>
      <PageHeader title="メンバー詳細" backHref="/members">
        {isAdmin && (
          <Link
            href={`/members/${m.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Pencil className="h-4 w-4" />
            編集
          </Link>
        )}
        <Link
          href={`/sales?member_id=${m.id}`}
          className={cn(buttonVariants({ variant: "primary" }))}
        >
          <Receipt className="h-4 w-4" />
          売上を見る
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardContent>
          <Row label="メンバーID">
            <span className="font-mono">{m.member_code}</span>
          </Row>
          <Row label="氏名">{m.name}</Row>
          <Row label="年齢">{m.age ?? "-"}</Row>
          <Row label="性別">{m.gender ? GENDER_LABELS[m.gender] : "-"}</Row>
          <Row label="雇用区分">
            <Badge variant={m.employment_type === "Proper" ? "brand" : "light"}>
              {EMPLOYMENT_LABELS[m.employment_type]}
            </Badge>
          </Row>
          <Row label="ログインユーザー">{m.linked_user?.login_id ?? "-"}</Row>
          <Row label="状態">
            {m.is_active ? (
              <Badge variant="success">有効</Badge>
            ) : (
              <Badge variant="default">無効</Badge>
            )}
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}
