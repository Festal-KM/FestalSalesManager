import { toYYYYMM } from "@/lib/date";

/**
 * sales_key 生成（要件10章）
 * 形式: ${member_code}_${client_code}_${YYYYMM}_${status}
 * 例:   M-000001_C-000010_202601_Actual
 */
export function buildSalesKey(params: {
  memberCode: string;
  clientCode: string;
  monthStart: Date;
  status: string;
}): string {
  return `${params.memberCode}_${params.clientCode}_${toYYYYMM(params.monthStart)}_${params.status}`;
}
