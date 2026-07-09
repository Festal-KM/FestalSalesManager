import { prisma } from "@/lib/prisma";

// トランザクション用クライアントの型（$transaction コールバック引数）
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * 採番（要件9章）: NumberSequence を +1 して連番コードを払い出す。
 * update の increment は行ロックされ、同時実行でも重複しない。
 * 必ずエンティティ作成と同一トランザクション内で呼ぶこと。
 */
export async function nextCode(tx: TxClient, seqKey: string): Promise<string> {
  const seq = await tx.numberSequence.update({
    where: { seq_key: seqKey },
    data: { current_no: { increment: 1 } },
  });
  const num = String(seq.current_no).padStart(seq.pad_digits, "0");
  return `${seq.prefix}${num}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 空いている最小の連番を採番候補として返す（gap優先）。
 * 既存コードの数値部分を見て、1 から順に未使用の最小番号を探す。
 * 例: 0010 だけ使用中なら 0001、0001〜0003 使用中なら 0004。
 * prefix に一致しない/数値でない手動コードは無視する。
 */
export function suggestSmallestFreeCode(
  existingCodes: string[],
  prefix: string,
  padDigits: number,
): string {
  const re = new RegExp(`^${escapeRegExp(prefix)}0*(\\d+)$`);
  const used = new Set<number>();
  for (const code of existingCodes) {
    const m = code.match(re);
    if (m) used.add(parseInt(m[1], 10));
  }
  let n = 1;
  while (used.has(n)) n++;
  return `${prefix}${String(n).padStart(padDigits, "0")}`;
}
