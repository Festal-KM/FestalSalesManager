// 給与テーブル（役職グレード別）。
// 各グレードは 5 パラメータ（初期月額・ピッチ額・分配率・賞与比率・ピッチ数）を持ち、
// 全 8 列は下記の数式で厳密に算出する（元スプレッドシートの値と一致）。

export type GradeKey =
  | "Analyst"
  | "Associate"
  | "Consultant"
  | "SeniorConsultant"
  | "Manager"
  | "SeniorManager"
  | "Director"
  | "Partner";

/** 表示順（低→高） */
export const GRADE_ORDER: GradeKey[] = [
  "Analyst",
  "Associate",
  "Consultant",
  "SeniorConsultant",
  "Manager",
  "SeniorManager",
  "Director",
  "Partner",
];

export const GRADE_LABELS: Record<GradeKey, string> = {
  Analyst: "アナリスト",
  Associate: "アソシエイト",
  Consultant: "コンサルタント",
  SeniorConsultant: "シニアコンサルタント",
  Manager: "マネージャー",
  SeniorManager: "シニアマネージャー",
  Director: "ディレクター",
  Partner: "パートナー",
};

export type GradeParam = {
  /** ピッチ1の月額 */
  base: number;
  /** 1ピッチあたりの月額増分 */
  pitchAmount: number;
  /** 分配率 */
  distribution: number;
  /** 賞与比率 */
  bonusRatio: number;
  /** ピッチ数（1..count） */
  count: number;
};

// 添付の給与テーブル画像から抽出したパラメータ。
export const GRADE_PARAMS: Record<GradeKey, GradeParam> = {
  Analyst: { base: 200_000, pitchAmount: 2_500, distribution: 0.8, bonusRatio: 0.1, count: 18 },
  Associate: { base: 250_000, pitchAmount: 3_000, distribution: 0.8, bonusRatio: 0.1, count: 18 },
  Consultant: { base: 310_000, pitchAmount: 3_500, distribution: 0.77, bonusRatio: 0.12, count: 20 },
  SeniorConsultant: { base: 390_000, pitchAmount: 4_000, distribution: 0.75, bonusRatio: 0.15, count: 20 },
  Manager: { base: 470_000, pitchAmount: 5_000, distribution: 0.7, bonusRatio: 0.175, count: 20 },
  SeniorManager: { base: 550_000, pitchAmount: 6_000, distribution: 0.7, bonusRatio: 0.2, count: 20 },
  Director: { base: 700_000, pitchAmount: 7_000, distribution: 0.67, bonusRatio: 0.225, count: 20 },
  Partner: { base: 850_000, pitchAmount: 8_000, distribution: 0.65, bonusRatio: 0.25, count: 20 },
};

export type SalaryRow = {
  pitch: number;
  monthly: number; // 月額
  annual: number; // 年額
  baseBonus: number; // 基準賞与
  annualPlusBonus: number; // 年額＋賞与
  targetIncome: number; // 年収目安（インセ込み）
  withInsurance: number; // 社保込み
  deptBudget: number; // 事業部予算
  salesTarget: number; // 売上目標
};

/** 指定グレード・ピッチの1行を算出する。 */
export function salaryRow(p: GradeParam, pitch: number): SalaryRow {
  const M = p.base + (pitch - 1) * p.pitchAmount; // 月額
  const annual = 12 * M;
  const X = (12 * M) / (1 - p.bonusRatio); // 年額＋賞与（未丸め）
  const targetIncome = (X * 19) / 18; // 年収目安（未丸め）
  return {
    pitch,
    monthly: M,
    annual,
    annualPlusBonus: Math.round(X),
    baseBonus: Math.round(X) - annual,
    targetIncome: Math.round(targetIncome),
    withInsurance: Math.round(targetIncome * 1.15),
    deptBudget: Math.round(X / 9),
    salesTarget: Math.round(
      300_000 + (457 * M) / (30 * (1 - p.bonusRatio) * p.distribution),
    ),
  };
}

/** 指定グレードの給与テーブル（ピッチ1..count）を返す。 */
export function salaryTable(key: GradeKey): SalaryRow[] {
  const p = GRADE_PARAMS[key];
  return Array.from({ length: p.count }, (_, i) => salaryRow(p, i + 1));
}
