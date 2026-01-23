import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: "administrator" | "manager";
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "administrator" | "manager";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "administrator" | "manager";
  }
}
