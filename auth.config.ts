import type { NextAuthConfig } from "next-auth";

type RoleLit = "Admin" | "User";

// Edge(proxy)でも安全な設定のみ。Prisma/bcrypt はここに置かない。
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // 実際の Credentials プロバイダは auth.ts で注入
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: RoleLit; login_id?: string };
        token.uid = u.id;
        token.role = u.role;
        token.login_id = u.login_id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const t = token as { uid?: string; login_id?: string; role?: RoleLit };
        session.user.id = t.uid ?? "";
        session.user.login_id = t.login_id ?? "";
        session.user.role = t.role ?? "User";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
