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

// ===== 会計年度（4月始まり） =====
// ダッシュボードの「当期売上見込み」「個人別実績」は 4月始まり会計年度で集計する。
// 上期 = 4〜9月 / 下期 = 10〜3月。会計年度 N = N年4月 〜 (N+1)年3月。

/** 会計年度の開始月（4月始まり） */
export const FISCAL_START_MONTH = 4;

/** 月初(UTC)が属する会計年度を返す */
export function fiscalYearOf(monthStart: Date): number {
  const y = monthStart.getUTCFullYear();
  const m = monthStart.getUTCMonth() + 1; // 1..12
  return m >= FISCAL_START_MONTH ? y : y - 1;
}

/** 現在の会計年度 */
export function currentFiscalYear(): number {
  return fiscalYearOf(currentMonthStart());
}

/** 月初(UTC)が属する会計上の半期（1=上期 4〜9月 / 2=下期 10〜3月） */
export function fiscalHalfOf(monthStart: Date): number {
  const m = monthStart.getUTCMonth() + 1; // 1..12
  return m >= FISCAL_START_MONTH && m <= FISCAL_START_MONTH + 5 ? 1 : 2;
}

/** 現在の会計半期（1 or 2） */
export function currentFiscalHalf(): number {
  return fiscalHalfOf(currentMonthStart());
}

/** 会計年度の [開始月初, 翌年度開始月初) を返す（範囲検索用） */
export function fiscalYearRange(fy: number): { start: Date; endExclusive: Date } {
  const start = new Date(Date.UTC(fy, FISCAL_START_MONTH - 1, 1));
  const endExclusive = new Date(Date.UTC(fy + 1, FISCAL_START_MONTH - 1, 1));
  return { start, endExclusive };
}

/** 会計年度の月並び（4,5,…,3月）を月初Dateで返す（12件・古い順） */
export function fiscalMonths(fy: number): Date[] {
  return Array.from({ length: 12 }, (_, i) => {
    // Date.UTC は月インデックスの繰り上がりを自動処理する（例: 12 → 翌年1月）
    return new Date(Date.UTC(fy, FISCAL_START_MONTH - 1 + i, 1));
  });
}

/** 直近nヶ月（当月含む）の月初Date配列（古い順） */
export function trailingMonths(n: number, from: Date = currentMonthStart()): Date[] {
  return Array.from({ length: n }, (_, i) => {
    return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - (n - 1 - i), 1));
  });
}

/** 月初Date に n ヶ月加算した月初Date（UTC） */
export function addMonths(monthStart: Date, n: number): Date {
  return new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + n, 1),
  );
}

/** [start, end]（両端含む・月初）の月を古い順に列挙する。start>end は空配列。 */
export function enumerateMonths(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  let cur = normalizeToMonthStart(start);
  const last = normalizeToMonthStart(end);
  while (cur.getTime() <= last.getTime()) {
    months.push(cur);
    cur = addMonths(cur, 1);
  }
  return months;
}
