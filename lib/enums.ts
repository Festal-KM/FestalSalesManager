// Enum の日本語ラベルと選択肢（要件7章）

export const ROLE_LABELS = {
  Admin: "管理者",
  User: "一般ユーザー",
} as const;

export const EMPLOYMENT_LABELS = {
  Proper: "プロパー",
  Outsource: "外注",
} as const;

export const GENDER_LABELS = {
  Male: "男性",
  Female: "女性",
  Other: "その他",
  Unknown: "不明",
} as const;

export const SALES_STATUS_LABELS = {
  Actual: "実績",
  Forecast: "見込み",
} as const;

export const EXPENSE_TYPE_LABELS = {
  Transportation: "交通費",
  Reimbursement: "立替経費",
  Other: "その他",
} as const;

export const CONTRACT_TYPE_LABELS = {
  SemiDelegation: "準委任",
  Contract: "請負委任",
  Other: "その他",
} as const;

export const CONTRACT_TYPES = ["SemiDelegation", "Contract", "Other"] as const;
export type ContractTypeLit = (typeof CONTRACT_TYPES)[number];

export const EMPLOYMENT_OPTIONS = [
  { value: "Proper", label: EMPLOYMENT_LABELS.Proper },
  { value: "Outsource", label: EMPLOYMENT_LABELS.Outsource },
];

export const GENDER_OPTIONS = [
  { value: "Male", label: GENDER_LABELS.Male },
  { value: "Female", label: GENDER_LABELS.Female },
  { value: "Other", label: GENDER_LABELS.Other },
  { value: "Unknown", label: GENDER_LABELS.Unknown },
];

export const SALES_STATUS_OPTIONS = [
  { value: "Actual", label: SALES_STATUS_LABELS.Actual },
  { value: "Forecast", label: SALES_STATUS_LABELS.Forecast },
];

export const EXPENSE_TYPE_OPTIONS = [
  { value: "Transportation", label: EXPENSE_TYPE_LABELS.Transportation },
  { value: "Reimbursement", label: EXPENSE_TYPE_LABELS.Reimbursement },
  { value: "Other", label: EXPENSE_TYPE_LABELS.Other },
];
