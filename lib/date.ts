// 対象月（period_month）まわりの日付ロジック（要件10-2, 10-3）
// period_month は必ず「月初1日」で保存する。時刻起因のズレを避けるため UTC で扱う。

/** 任意の日付を、その月の1日(UTC)に正規化した Date を返す */
export function normalizeToMonthStart(value: Date | string): Date {
  const d = typeof value === "string" ? parseDateInput(value) : value;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** "YYYY-MM" または "YYYY-MM-DD" を UTC Date として解釈 */
export function parseDateInput(value: string): Date {
  const ym = value.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    return new Date(Date.UTC(Number(ym[1]), Number(ym[2]) - 1, 1));
  }
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
  }
  return new Date(value);
}

/** 月初(UTC)の Date から year / half / month を算出（要件10-3） */
export function deriveYearHalfMonth(monthStart: Date): {
  year: number;
  half: number;
  month: number;
} {
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth() + 1; // 1..12
  const half = month <= 6 ? 1 : 2;
  return { year, half, month };
}

/** Date を YYYYMM 文字列に（sales_key用） */
export function toYYYYMM(monthStart: Date): string {
  const y = monthStart.getUTCFullYear();
  const m = String(monthStart.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/** Date を <input type="month"> 用の "YYYY-MM" に */
export function toMonthInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** 現在の当月1日(UTC) */
export function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
