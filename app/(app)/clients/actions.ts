"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export type ClientFormState = { error?: string };

type ParsedContact = { name: string; contact_method: string | null };

/** 取引先コードを正規化: C + 3桁ゼロ埋め（例: 5→C005, c12→C012） */
function normalizeClientCode(raw: string): string {
  const v = raw.trim();
  const m = v.match(/^C?-?0*(\d+)$/i);
  return m ? `C${m[1].padStart(3, "0")}` : v;
}

/** 担当者（複数）を hidden の "contacts"（JSON配列）から取得＋検証 */
function parseContacts(
  formData: FormData,
): { contacts: ParsedContact[] } | { error: string } {
  const raw = String(formData.get("contacts") ?? "").trim();
  if (!raw) return { contacts: [] };
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return { error: "担当者データの形式が不正です" };
  }
  if (!Array.isArray(arr)) return { error: "担当者データの形式が不正です" };

  const out: ParsedContact[] = [];
  for (const item of arr) {
    const o = (item ?? {}) as { name?: string; contact_method?: string };
    const name = (o.name ?? "").trim();
    const method = (o.contact_method ?? "").trim();
    // 名前・連絡手段の両方が空の行はスキップ
    if (!name && !method) continue;
    if (!name) return { error: "担当者名を入力してください" };
    out.push({ name, contact_method: method || null });
  }
  return { contacts: out };
}

/** S41 取引先の登録・編集（Admin専用）。id空=新規 / id有=編集 */
export async function saveClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const client_code = normalizeClientCode(String(formData.get("client_code") ?? ""));
  const company_name = String(formData.get("company_name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  if (!company_name || !client_code) return { error: "必須項目を入力してください" };
  const parsed = parseContacts(formData);
  if ("error" in parsed) return { error: parsed.error };

  // コード重複チェック（@unique でも担保）
  const dup = await prisma.client.findFirst({
    where: { client_code, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (dup) return { error: "この取引先IDは既に使われています" };

  const data = { client_code, company_name, note: note || null };

  await prisma.$transaction(async (tx) => {
    let clientId: string;
    if (!id) {
      const created = await tx.client.create({
        data: { ...data, is_active: true },
        select: { id: true },
      });
      clientId = created.id;
      // 採番の現在値を、使ったコード以上に進める
      const m = client_code.match(/^C0*(\d+)$/);
      if (m) {
        const used = parseInt(m[1], 10);
        const seq = await tx.numberSequence.findUnique({
          where: { seq_key: "CLIENT" },
          select: { current_no: true },
        });
        if (seq && used > seq.current_no) {
          await tx.numberSequence.update({
            where: { seq_key: "CLIENT" },
            data: { current_no: used },
          });
        }
      }
    } else {
      await tx.client.update({ where: { id }, data: { ...data, is_active } });
      clientId = id;
    }
    // 担当者は全置換
    await tx.contact.deleteMany({ where: { client_id: clientId } });
    if (parsed.contacts.length > 0) {
      await tx.contact.createMany({
        data: parsed.contacts.map((c) => ({
          client_id: clientId,
          name: c.name,
          contact_method: c.contact_method,
        })),
      });
    }
  });

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
