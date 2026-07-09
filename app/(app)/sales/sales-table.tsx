"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Check } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal, DetailRow } from "@/components/ui/modal";
import { EMPLOYMENT_LABELS, SALES_STATUS_LABELS, EXPENSE_TYPE_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { promoteSale } from "./actions";

export type SaleVM = {
  id: string;
  period: string;
  memberName: string;
  employment_type: keyof typeof EMPLOYMENT_LABELS;
  clientName: string;
  amount: string;
  status: keyof typeof SALES_STATUS_LABELS;
  purchaseCost: string | null;
  expenses: {
    id: string;
    type: keyof typeof EXPENSE_TYPE_LABELS;
    amount: string;
    note: string | null;
  }[];
  memo: string | null;
};

function CostList({ sale }: { sale: SaleVM }) {
  if (sale.expenses.length === 0 && !sale.purchaseCost) {
    return <span className="text-muted-fg">-</span>;
  }
  return (
    <div className="space-y-1">
      {sale.purchaseCost && (
        <div className="whitespace-nowrap text-xs">
          <span className="text-muted-fg">仕入単価</span>{" "}
          <span className="font-medium">{sale.purchaseCost}</span>
        </div>
      )}
      {sale.expenses.map((ex) => (
        <div key={ex.id} className="whitespace-nowrap text-xs">
          <span className="text-muted-fg">{EXPENSE_TYPE_LABELS[ex.type]}</span>{" "}
          <span className="font-medium">{ex.amount}</span>
          {ex.type === "Other" && ex.note && (
            <span className="ml-1 text-muted-fg">（{ex.note}）</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function SalesTable({ sales }: { sales: SaleVM[] }) {
  const [sel, setSel] = useState<SaleVM | null>(null);

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>対象月</TH>
            <TH>メンバー</TH>
            <TH>雇用区分</TH>
            <TH>取引先</TH>
            <TH className="text-right">売上金額</TH>
            <TH>予実</TH>
            <TH>コスト</TH>
            <TH>メモ</TH>
            <TH>操作</TH>
          </TR>
        </THead>
        <TBody>
          {sales.map((s) => (
            <TR
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => setSel(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(s);
                }
              }}
              className="cursor-pointer hover:bg-base focus-visible:bg-base focus-visible:outline-none"
            >
              <TD>{s.period}</TD>
              <TD>
                <div className="font-medium">{s.memberName}</div>
              </TD>
              <TD>
                <Badge variant={s.employment_type === "Proper" ? "brand" : "light"}>
                  {EMPLOYMENT_LABELS[s.employment_type]}
                </Badge>
              </TD>
              <TD>
                <div className="font-medium">{s.clientName}</div>
              </TD>
              <TD className="text-right font-medium">{s.amount}</TD>
              <TD>
                <Badge variant={s.status === "Actual" ? "success" : "warning"}>
                  {SALES_STATUS_LABELS[s.status]}
                </Badge>
              </TD>
              <TD>
                <CostList sale={s} />
              </TD>
              <TD className="max-w-40 truncate text-muted-fg">{s.memo ?? "-"}</TD>
              <TD>
                {s.status === "Forecast" ? (
                  <form
                    action={promoteSale}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="light" size="sm" title="実績にする">
                      <Check className="h-3.5 w-3.5" />
                      実績にする
                    </Button>
                  </form>
                ) : (
                  <span className="text-muted-fg">-</span>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Modal
        open={!!sel}
        onClose={() => setSel(null)}
        eyebrow="Sales"
        title={sel ? `${sel.period}　${sel.memberName}` : "売上詳細"}
        footer={
          sel ? (
            <>
              <button
                type="button"
                onClick={() => setSel(null)}
                className={cn(buttonVariants({ variant: "back" }))}
              >
                閉じる
              </button>
              <Link
                href={`/sales/${sel.id}/edit`}
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                <Pencil className="h-4 w-4" />
                編集
              </Link>
            </>
          ) : null
        }
      >
        {sel && (
          <div>
            <DetailRow label="対象月">{sel.period}</DetailRow>
            <DetailRow label="メンバー">{sel.memberName}</DetailRow>
            <DetailRow label="雇用区分">
              <Badge variant={sel.employment_type === "Proper" ? "brand" : "light"}>
                {EMPLOYMENT_LABELS[sel.employment_type]}
              </Badge>
            </DetailRow>
            <DetailRow label="取引先">{sel.clientName}</DetailRow>
            <DetailRow label="売上金額">
              <span className="font-medium">{sel.amount}</span>
            </DetailRow>
            <DetailRow label="予実">
              <Badge variant={sel.status === "Actual" ? "success" : "warning"}>
                {SALES_STATUS_LABELS[sel.status]}
              </Badge>
            </DetailRow>
            <DetailRow label="コスト">
              <CostList sale={sel} />
            </DetailRow>
            <DetailRow label="メモ">
              {sel.memo ? (
                <span className="whitespace-pre-wrap">{sel.memo}</span>
              ) : (
                "-"
              )}
            </DetailRow>
          </div>
        )}
      </Modal>
    </>
  );
}
