"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Users,
  Building2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { signOutAction } from "@/app/auth-actions";
import { ROLE_LABELS } from "@/lib/enums";
import { cn } from "@/lib/utils";
import type { Role } from "@/app/generated/prisma/enums";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard, adminOnly: true },
  { href: "/my", label: "個人実績表", icon: ClipboardList, adminOnly: false },
  { href: "/members", label: "メンバー一覧", icon: Users, adminOnly: true },
  { href: "/clients", label: "取引先一覧", icon: Building2, adminOnly: true },
];

// 売上一覧の契約区分サブメニュー
const SALES_SUBS = [
  { contract: "SemiDelegation", label: "準委任" },
  { contract: "Contract", label: "請負委任" },
  { contract: "Other", label: "その他" },
];

export function Sidebar({ loginId, role }: { loginId: string; role: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onSales = pathname === "/sales" || pathname.startsWith("/sales/");
  const [salesOpen, setSalesOpen] = useState(onSales);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // 現在の契約区分（未指定は準委任）
  const curContract = searchParams.get("contract") ?? "SemiDelegation";

  const isAdmin = role === "Admin";
  const navItems = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "bg-brand-light/20 text-white"
        : "text-sidebar-fg hover:bg-white/10 hover:text-white",
      collapsed && "justify-center px-0",
    );

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
        {/* ダッシュボード / 個人実績表 */}
        {navItems
          .filter((i) => i.href === "/dashboard" || i.href === "/my")
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={linkClass(isActive(item.href))}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

        {/* 売上一覧（契約区分プルダウン）: 管理者のみ */}
        {isAdmin &&
          (collapsed ? (
            <Link
              href="/sales"
              title="売上一覧"
              className={linkClass(onSales)}
            >
              <Receipt className="h-5 w-5 shrink-0" />
            </Link>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setSalesOpen((v) => !v)}
                className={cn(linkClass(onSales), "w-full justify-between")}
              >
                <span className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 shrink-0" />
                  <span className="truncate">売上一覧</span>
                </span>
                {salesOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
              </button>
              {salesOpen && (
                <div className="mt-1 space-y-1 pl-6">
                  {SALES_SUBS.map((sub) => {
                    const active = onSales && curContract === sub.contract;
                    return (
                      <Link
                        key={sub.contract}
                        href={`/sales?contract=${sub.contract}`}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-brand-light/20 text-white"
                            : "text-sidebar-fg hover:bg-white/10 hover:text-white",
                        )}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

        {/* メンバー / 取引先 */}
        {navItems
          .filter((i) => i.href === "/members" || i.href === "/clients")
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={linkClass(isActive(item.href))}
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
