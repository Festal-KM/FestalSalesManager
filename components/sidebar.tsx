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
      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-white/10 text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-brand-light"
        : "text-sidebar-fg hover:bg-white/[0.06] hover:text-white",
      collapsed && "justify-center px-0",
    );

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col bg-brand-dark text-sidebar-fg transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* ヘッダー: ロゴ（透明背景PNG） */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-3">
        {!collapsed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="Festal Sales Manager" className="h-9 w-auto" />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto rounded p-1.5 text-sidebar-fg hover:bg-white/10"
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
      <nav className="flex-1 space-y-1 px-2 py-3">
        {!collapsed && (
          <div className="eyebrow px-3 pb-2 pt-1 text-sidebar-fg/50">Menu</div>
        )}
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
                          "relative block rounded-lg px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-white/10 font-medium text-white"
                            : "text-sidebar-fg/90 hover:bg-white/[0.06] hover:text-white",
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
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light/15 text-xs font-semibold uppercase text-brand-light">
              {loginId.slice(0, 2)}
            </div>
            <div className="min-w-0 text-xs">
              <div className="truncate font-medium text-white">{loginId}</div>
              <div className="text-sidebar-fg/70">{ROLE_LABELS[role]}</div>
            </div>
          </div>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            title={collapsed ? "ログアウト" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-fg transition-colors hover:bg-white/[0.06] hover:text-white",
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
