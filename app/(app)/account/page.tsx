import { requireUser, getCurrentDbUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EMPLOYMENT_LABELS, GENDER_LABELS } from "@/lib/enums";
import { GRADE_LABELS, type GradeKey } from "@/lib/salary-tables";
import { PasswordChange } from "./password-change";

export const metadata = { title: "マイページ | 成績管理ツール" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex border-b border-gray-100 py-3 last:border-0">
      <div className="w-40 shrink-0 text-sm text-muted-fg">{label}</div>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

export default async function AccountPage() {
  await requireUser();
  const dbUser = await getCurrentDbUser();
  const m = dbUser?.linked_member ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="My Page"
        title="マイページ"
        description="アカウント情報の確認とパスワードの変更"
      />

      <Section title="アカウント情報">
        {m ? (
          <>
            <Row label="メンバーコード">
              <span className="font-mono">{m.member_code}</span>
            </Row>
            <Row label="氏名">{m.name}</Row>
            <Row label="年齢">{m.age ?? "-"}</Row>
            <Row label="性別">{m.gender ? GENDER_LABELS[m.gender] : "-"}</Row>
            <Row label="役職">{m.position ?? "-"}</Row>
            <Row label="部署">{m.department ?? "-"}</Row>
            <Row label="役職（給与グレード）">
              {m.grade ? GRADE_LABELS[m.grade as GradeKey] : "-"}
            </Row>
            <Row label="ピッチ">{m.pitch ?? "-"}</Row>
            <Row label="雇用区分">
              <Badge variant={m.employment_type === "Proper" ? "brand" : "light"}>
                {EMPLOYMENT_LABELS[m.employment_type]}
              </Badge>
            </Row>
            <Row label="ログインID">{dbUser?.login_id ?? "-"}</Row>
          </>
        ) : (
          <>
            <Row label="ログインID">{dbUser?.login_id ?? "-"}</Row>
            <p className="pt-3 text-sm text-muted-fg">
              メンバー情報は、管理者がメンバーとの紐づけを行うと表示されます。
            </p>
          </>
        )}
      </Section>

      <Section title="パスワード変更">
        <PasswordChange />
      </Section>
    </div>
  );
}
