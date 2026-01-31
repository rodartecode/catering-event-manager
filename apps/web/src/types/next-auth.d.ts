import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

export type UserRole = "administrator" | "manager" | "client";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: UserRole;
    clientId?: number | null;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      clientId?: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    clientId?: number | null;
  }
}
