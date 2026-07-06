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
