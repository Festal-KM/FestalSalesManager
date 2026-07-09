"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Modal, DetailRow } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export type ClientVM = {
  id: string;
  client_code: string;
  company_name: string;
  note: string | null;
  is_active: boolean;
  contacts: { id: string; name: string; contact_method: string | null }[];
};

export function ClientsTable({
  clients,
  isAdmin,
}: {
  clients: ClientVM[];
  isAdmin: boolean;
}) {
  const [sel, setSel] = useState<ClientVM | null>(null);

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>取引先ID</TH>
            <TH>会社名</TH>
            <TH>担当者</TH>
            <TH>連絡手段</TH>
            <TH>状態</TH>
          </TR>
        </THead>
        <TBody>
          {clients.map((c) => (
            <TR
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => setSel(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(c);
                }
              }}
              className="cursor-pointer hover:bg-base focus-visible:bg-base focus-visible:outline-none"
            >
              <TD className="font-mono text-xs">{c.client_code}</TD>
              <TD className="font-medium">{c.company_name}</TD>
              <TD>
                {c.contacts.length === 0 ? (
                  <span className="text-muted-fg">-</span>
                ) : (
                  <div className="space-y-0.5">
                    {c.contacts.map((ct) => (
                      <div key={ct.id} className="text-xs font-medium">
                        {ct.name}
                      </div>
                    ))}
                  </div>
                )}
              </TD>
              <TD>
                {c.contacts.length === 0 ? (
                  <span className="text-muted-fg">-</span>
                ) : (
                  <div className="space-y-0.5">
                    {c.contacts.map((ct) => (
                      <div key={ct.id} className="text-xs text-muted-fg">
                        {ct.contact_method || "-"}
                      </div>
                    ))}
                  </div>
                )}
              </TD>
              <TD>
                {c.is_active ? (
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
        eyebrow="Client"
        title={sel ? sel.company_name : "取引先詳細"}
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
                  href={`/clients/${sel.id}/edit`}
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
            <DetailRow label="取引先ID">
              <span className="font-mono">{sel.client_code}</span>
            </DetailRow>
            <DetailRow label="会社名">{sel.company_name}</DetailRow>
            <DetailRow label="担当者">
              {sel.contacts.length === 0 ? (
                <span className="text-muted-fg">-</span>
              ) : (
                <div className="space-y-2">
                  {sel.contacts.map((ct) => (
                    <div key={ct.id}>
                      <div className="font-medium">{ct.name}</div>
                      <div className="text-xs text-muted-fg">
                        {ct.contact_method || "連絡手段の登録なし"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailRow>
            <DetailRow label="備考">
              {sel.note ? (
                <span className="whitespace-pre-wrap">{sel.note}</span>
              ) : (
                "-"
              )}
            </DetailRow>
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
