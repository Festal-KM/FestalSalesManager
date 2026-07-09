"use client";

import { useRouter } from "next/navigation";
import { TR } from "@/components/ui/table";

/** 行全体をクリック/Enter で開けるテーブル行（メンバー実績一覧用） */
export function MemberRow({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <TR
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className="cursor-pointer hover:bg-base focus-visible:bg-base focus-visible:outline-none"
    >
      {children}
    </TR>
  );
}
