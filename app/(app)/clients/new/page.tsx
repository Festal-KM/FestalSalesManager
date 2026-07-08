import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../client-form";

export const metadata = { title: "取引先登録 | 成績管理ツール" };

export default async function NewClientPage() {
  await requireAdmin("/clients"); // 要件23-2 Admin専用
  const seq = await prisma.numberSequence.findUnique({
    where: { seq_key: "CLIENT" },
  });
  // 次の採番候補（例: C002）。フォームで変更可能。
  const suggestedCode = seq
    ? `${seq.prefix}${String(seq.current_no + 1).padStart(seq.pad_digits, "0")}`
    : "";

  return (
    <div>
      <PageHeader title="取引先登録" backHref="/clients" />
      <ClientForm mode="new" suggestedCode={suggestedCode} />
    </div>
  );
}
