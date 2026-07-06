"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { nextCode } from "@/lib/numbering";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClientFormState = { error?: string };

/** S41 取引先の登録・編集（Admin専用）。id空=新規 / id有=編集 */
export async function saveClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const company_name = String(formData.get("company_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const billing_contact_name = String(formData.get("billing_contact_name") ?? "").trim();
  const billing_contact_email = String(formData.get("billing_contact_email") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  // 要件23-8 バリデーション
  if (!company_name) return { error: "会社名は必須です" };
  if (billing_contact_email && !EMAIL_RE.test(billing_contact_email)) {
    return { error: "メールアドレスの形式が正しくありません" };
  }

  const data = {
    company_name,
    address: address || null,
    billing_contact_name: billing_contact_name || null,
    billing_contact_email: billing_contact_email || null,
  };

  if (!id) {
    // 新規: client_code を採番（要件23-9）。is_active は true 固定。
    await prisma.$transaction(async (tx) => {
      const client_code = await nextCode(tx, "CLIENT");
      await tx.client.create({ data: { ...data, client_code, is_active: true } });
    });
  } else {
    // 編集: client_code は更新しない（要件23-10）
    await prisma.client.update({ where: { id }, data: { ...data, is_active } });
  }

  revalidatePath("/clients");
  redirect("/clients");
}

/** S41 無効化（is_active=false）。要件23-11 */
export async function deactivateClient(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    await prisma.client.update({ where: { id }, data: { is_active: false } });
  }
  revalidatePath("/clients");
  redirect("/clients");
}
