import { requireAdminPage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { suggestSmallestFreeCode } from "@/lib/numbering";
import { ClientForm } from "../client-form";

export const metadata = { title: "取引先登録 | 成績管理ツール" };

export default async function NewClientPage() {
  await requireAdminPage(); // 要件23-2 Admin専用（一般ユーザーは /my へ）
  const [seq, clients] = await Promise.all([
    prisma.numberSequence.findUnique({ where: { seq_key: "CLIENT" } }),
    prisma.client.findMany({ select: { client_code: true } }),
  ]);
  // 空いている最小の番号を採番候補に（例: C010 のみ使用中なら C001）。フォームで変更可能。
  const suggestedCode = seq
    ? suggestSmallestFreeCode(
        clients.map((c) => c.client_code),
        seq.prefix,
        seq.pad_digits,
      )
    : "";

  return (
    <div>
      <PageHeader title="取引先登録" backHref="/clients" />
      <ClientForm mode="new" suggestedCode={suggestedCode} />
    </div>
  );
}
