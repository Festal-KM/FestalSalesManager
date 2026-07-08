"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Users,
  Building2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { signOutAction } from "@/app/auth-actions";
import { ROLE_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/my", label: "個人実績表", icon: ClipboardList },
  { href: "/sales", label: "売上一覧", icon: Receipt },
  { href: "/members", label: "メンバー一覧", icon: Users },
  { href: "/clients", label: "取引先一覧", icon: Building2 },
];

export function Sidebar({
  loginId,
  role,
}: {
  loginId: string;
  role: Role;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col bg-brand-dark text-sidebar-fg transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* ヘッダー: ロゴ枠（ロゴ実装前のプレースホルダー） */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-3">
        {!collapsed && (
          <div
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-dashed border-white/25 text-[11px] font-semibold tracking-widest text-white/40"
            aria-label="ロゴ"
          >
            LOGO
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded p-1.5 text-sidebar-fg hover:bg-white/10"
          title={collapsed ? "開く" : "閉じる"}
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* メニュー */}
      <nav className="flex-1 space-y-1 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-light/20 text-white"
                  : "text-sidebar-fg hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* フッター: ユーザー情報 + ログアウト */}
      <div className="border-t border-white/10 p-2">
        {!collapsed && (
          <div className="px-2 pb-2 text-xs text-sidebar-fg/80">
            <div className="truncate font-medium text-white">{loginId}</div>
            <div>{ROLE_LABELS[role]}</div>
          </div>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            title={collapsed ? "ログアウト" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-fg transition-colors hover:bg-white/10 hover:text-white",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>ログアウト</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
