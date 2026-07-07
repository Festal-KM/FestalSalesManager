import { prisma } from "@/lib/prisma";
import { currentMonthStart } from "@/lib/date";
import { buildSalesKey } from "@/lib/sales-key";

/**
 * 見込み→実績の自動反映。
 * 「前月以前＝実績」ルールに従い、対象月が当月より前（＝到来済み）の見込み(Forecast)を
 * 実績(Actual)へ昇格する。ダッシュボード／売上一覧の表示時に呼ぶ想定（冪等）。
 *
 * sales_key は status を含むため、昇格時に Actual 用のキーへ振り直す。
 * 既に同一(メンバー×取引先×対象月)の Actual キーが存在する場合は二重計上を避けるため
 * 見込み側を論理削除する。
 *
 * @returns 実績へ昇格した件数
 */
export async function syncDueSalesStatuses(): Promise<number> {
  const cutoff = currentMonthStart(); // これより前の月を「到来済み」とみなす

  const due = await prisma.salesEntry.findMany({
    where: {
      is_deleted: false,
      status: "Forecast",
      period_month: { lt: cutoff },
    },
    select: {
      id: true,
      period_month: true,
      member: { select: { member_code: true } },
      client: { select: { client_code: true } },
    },
  });
  if (due.length === 0) return 0;

  const targets = due.map((d) => ({
    id: d.id,
    key: buildSalesKey({
      memberCode: d.member.member_code,
      clientCode: d.client.client_code,
      monthStart: d.period_month,
      status: "Actual",
    }),
  }));

  // 目標の Actual キーを既に持つ行（論理削除含む＝一意制約対象）を洗い出す
  const taken = await prisma.salesEntry.findMany({
    where: { sales_key: { in: targets.map((t) => t.key) } },
    select: { sales_key: true },
  });
  const takenKeys = new Set(taken.map((r) => r.sales_key));

  let promoted = 0;
  await prisma.$transaction(async (tx) => {
    for (const t of targets) {
      if (takenKeys.has(t.key)) {
        // 既に実績が存在 → 見込みは論理削除（二重計上防止）
        await tx.salesEntry.update({
          where: { id: t.id },
          data: { is_deleted: true },
        });
      } else {
        await tx.salesEntry.update({
          where: { id: t.id },
          data: { status: "Actual", sales_key: t.key },
        });
        promoted++;
      }
    }
  });

  return promoted;
}
