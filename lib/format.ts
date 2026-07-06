// 表示用フォーマット（要件32: 金額はカンマ区切り、日付は年月表示）

/** 金額をカンマ区切り + 円 で表示 */
export function formatYen(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "-";
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 数値をカンマ区切りで（円記号なし） */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("ja-JP");
}

/** Date/文字列を「YYYY年M月」で表示 */
export function formatYearMonth(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`;
}

/** Date/文字列を「YYYY-MM-DD」で表示 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
