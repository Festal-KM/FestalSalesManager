import type { DefaultSession } from "next-auth";
import type { Role } from "@/app/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      login_id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    login_id?: string;
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    login_id?: string;
    role?: Role;
  }
}
