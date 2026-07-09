"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Modal, DetailRow } from "@/components/ui/modal";
import { ROLE_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";

export type UserVM = {
  id: string;
  login_id: string;
  role: keyof typeof ROLE_LABELS;
  is_active: boolean;
  linked_member_label: string | null;
  created_at: string;
  is_self: boolean;
};

export function UsersTable({ users }: { users: UserVM[] }) {
  const [sel, setSel] = useState<UserVM | null>(null);

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>ログインID</TH>
            <TH>役割</TH>
            <TH>紐づくメンバー</TH>
            <TH>状態</TH>
            <TH>作成日</TH>
          </TR>
        </THead>
        <TBody>
          {users.map((u) => (
            <TR
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => setSel(u)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(u);
                }
              }}
              className="cursor-pointer hover:bg-base focus-visible:bg-base focus-visible:outline-none"
            >
              <TD className="font-medium">
                {u.login_id}
                {u.is_self && (
                  <span className="ml-2 text-xs text-muted-fg">(自分)</span>
                )}
              </TD>
              <TD>
                <Badge variant={u.role === "Admin" ? "brand" : "default"}>
                  {ROLE_LABELS[u.role]}
                </Badge>
              </TD>
              <TD className="text-muted-fg">{u.linked_member_label ?? "-"}</TD>
              <TD>
                {u.is_active ? (
                  <Badge variant="success">有効</Badge>
                ) : (
                  <Badge variant="default">無効</Badge>
                )}
              </TD>
              <TD className="text-muted-fg">{u.created_at}</TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Modal
        open={!!sel}
        onClose={() => setSel(null)}
        eyebrow="User"
        title={sel ? sel.login_id : "ユーザー詳細"}
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
                href={`/users/${sel.id}/edit`}
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
            <DetailRow label="ログインID">{sel.login_id}</DetailRow>
            <DetailRow label="役割">
              <Badge variant={sel.role === "Admin" ? "brand" : "default"}>
                {ROLE_LABELS[sel.role]}
              </Badge>
            </DetailRow>
            <DetailRow label="紐づくメンバー">
              {sel.linked_member_label ?? "（紐づけなし）"}
            </DetailRow>
            <DetailRow label="状態">
              {sel.is_active ? (
                <Badge variant="success">有効</Badge>
              ) : (
                <Badge variant="default">無効</Badge>
              )}
            </DetailRow>
            <DetailRow label="作成日">{sel.created_at}</DetailRow>
          </div>
        )}
      </Modal>
    </>
  );
}
