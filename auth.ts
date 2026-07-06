import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        login_id: { label: "ログインID", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      authorize: async (credentials) => {
        const login_id =
          typeof credentials?.login_id === "string" ? credentials.login_id : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!login_id || !password) return null;

        const user = await prisma.user.findUnique({ where: { login_id } });
        // 要件14: 無効ユーザー(is_active=false)はログイン不可
        if (!user || !user.is_active) return null;

        const ok = await bcrypt.compare(password, user.login_pw);
        if (!ok) return null;

        return { id: user.id, login_id: user.login_id, role: user.role };
      },
    }),
  ],
});
