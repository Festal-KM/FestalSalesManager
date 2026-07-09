"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Modal, DetailRow } from "@/components/ui/modal";
import { EMPLOYMENT_LABELS, GENDER_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";

export type MemberVM = {
  id: string;
  member_code: string;
  name: string;
  age: number | null;
  gender: keyof typeof GENDER_LABELS | null;
  position: string | null;
  department: string | null;
  employment_type: keyof typeof EMPLOYMENT_LABELS;
  affiliation: string | null;
  purchase_unit_price: string | null;
  login_id: string | null;
  is_active: boolean;
};

export function MembersTable({
  members,
  isAdmin,
}: {
  members: MemberVM[];
  isAdmin: boolean;
}) {
  const [sel, setSel] = useState<MemberVM | null>(null);

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>メンバーコード</TH>
            <TH>氏名</TH>
            <TH>役職</TH>
            <TH>部署</TH>
            <TH>雇用区分</TH>
            <TH>ログインユーザー</TH>
            <TH>状態</TH>
          </TR>
        </THead>
        <TBody>
          {members.map((m) => (
            <TR
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => setSel(m)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(m);
                }
              }}
              className="cursor-pointer hover:bg-base focus-visible:bg-base focus-visible:outline-none"
            >
              <TD className="font-mono text-xs">{m.member_code}</TD>
              <TD className="font-medium">{m.name}</TD>
              <TD>{m.position ?? "-"}</TD>
              <TD>{m.department ?? "-"}</TD>
              <TD>
                <Badge variant={m.employment_type === "Proper" ? "brand" : "light"}>
                  {EMPLOYMENT_LABELS[m.employment_type]}
                </Badge>
              </TD>
              <TD className="text-muted-fg">{m.login_id ?? "-"}</TD>
              <TD>
                {m.is_active ? (
                  <Badge variant="success">有効</Badge>
                ) : (
                  <Badge variant="default">無効</Badge>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Modal
        open={!!sel}
        onClose={() => setSel(null)}
        eyebrow="Member"
        title={sel ? sel.name : "メンバー詳細"}
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
              {isAdmin && (
                <Link
                  href={`/members/${sel.id}/edit`}
                  className={cn(buttonVariants({ variant: "primary" }))}
                >
                  <Pencil className="h-4 w-4" />
                  編集
                </Link>
              )}
            </>
          ) : null
        }
      >
        {sel && (
          <div>
            <DetailRow label="メンバーコード">
              <span className="font-mono">{sel.member_code}</span>
            </DetailRow>
            <DetailRow label="氏名">{sel.name}</DetailRow>
            <DetailRow label="年齢">{sel.age ?? "-"}</DetailRow>
            <DetailRow label="性別">
              {sel.gender ? GENDER_LABELS[sel.gender] : "-"}
            </DetailRow>
            <DetailRow label="役職">{sel.position ?? "-"}</DetailRow>
            <DetailRow label="部署">{sel.department ?? "-"}</DetailRow>
            <DetailRow label="雇用区分">
              <Badge variant={sel.employment_type === "Proper" ? "brand" : "light"}>
                {EMPLOYMENT_LABELS[sel.employment_type]}
              </Badge>
            </DetailRow>
            {sel.employment_type === "Outsource" && (
              <>
                <DetailRow label="所属">{sel.affiliation ?? "-"}</DetailRow>
                <DetailRow label="仕入単価">
                  {sel.purchase_unit_price ?? "-"}
                </DetailRow>
              </>
            )}
            <DetailRow label="ログインユーザー">{sel.login_id ?? "-"}</DetailRow>
            <DetailRow label="状態">
              {sel.is_active ? (
                <Badge variant="success">有効</Badge>
              ) : (
                <Badge variant="default">無効</Badge>
              )}
            </DetailRow>
          </div>
        )}
      </Modal>
    </>
  );
}
