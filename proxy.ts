import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 で middleware は proxy に改称（機能は同一）。
const { auth } = NextAuth(authConfig);

// Admin 専用パス（要件11-2）。User が直接 URL アクセスしたらダッシュボードへ戻す。
const ADMIN_ONLY = /^\/(members|clients)\/(new|[^/]+\/edit)$/;

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;
  const isLoginPage = path === "/login";

  // 未ログインガード（要件11-1）
  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  // ログイン済みでログイン画面に来たらダッシュボードへ（要件14-4-1）
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  // Admin 専用ガード
  if (isLoggedIn && ADMIN_ONLY.test(path)) {
    const role = req.auth?.user?.role;
    if (role !== "Admin") {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return undefined;
});

export const config = {
  // api / 静的ファイル / 画像 は対象外
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
