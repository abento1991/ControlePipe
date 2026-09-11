import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER";
      initials: string;
      color: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role?: "ADMIN" | "USER";
    initials?: string;
    color?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: { email: { label: "E-mail", type: "email" }, password: { label: "Senha", type: "password" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !user.isActive || user.isArchived) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials ?? undefined, color: user.color };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.initials = user.initials ?? "";
        token.color = user.color ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
      session.user.initials = (token.initials as string) ?? "";
      session.user.color = (token.color as string | null) ?? null;
      return session;
    },
  },
});
