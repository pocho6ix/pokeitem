import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion",
    newUser: "/inscription",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        autoLoginToken: { label: "Auto-login token", type: "text" },
      },
      async authorize(credentials) {
        // ── Auto-login after email verification ──────────────────────────
        if (credentials?.autoLoginToken) {
          try {
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");
            const { payload } = await jwtVerify(credentials.autoLoginToken, secret);
            if (payload.type !== "autologin" || typeof payload.userId !== "string") return null;

            const user = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!user || user.deletedAt) return null;

            return { id: user.id, name: user.name, email: user.email, image: null };
          } catch {
            return null;
          }
        }

        // ── Standard email + password login ──────────────────────────────
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Block login if email not verified
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Block login if account has been deleted
        if (user.deletedAt) {
          throw new Error("ACCOUNT_DELETED");
        }

        // NEVER return image here — base64 would end up in token.picture (→ 494)
        return { id: user.id, name: user.name, email: user.email, image: null };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  events: {
    async signIn({ user, account }) {
      // Auto-verify email for Google sign-ins (Google already verifies emails)
      if (account?.provider === 'google' && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        }).catch(() => {})
      }
    }
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign-in: populate token from user object
      if (user) {
        token.id   = user.id;
        token.name = user.name ?? null;
        // Fetch hasAvatar from DB — authorize() returns image:null so we can't rely on user.image
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { image: true },
        });
        token.hasAvatar = !!dbUser?.image;
        // NextAuth auto-sets token.picture from user.image — explicitly clear it
        // to guarantee no base64 ever leaks into the JWT cookie.
        delete (token as Record<string, unknown>).picture;
        delete (token as Record<string, unknown>).image;
      }

      // Called when update() is invoked client-side (avatar / name change)
      if (trigger === "update") {
        if (session?.hasAvatar !== undefined) token.hasAvatar = session.hasAvatar;
        if (session?.name      !== undefined) token.name      = session.name;
      }

      // For sessions issued before hasAvatar was in token, fetch from DB once
      if (token.id && token.hasAvatar === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { image: true, name: true },
        });
        token.hasAvatar = !!dbUser?.image;
        if (token.name === undefined) token.name = dbUser?.name ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id: string;
          name?: string | null;
          hasAvatar?: boolean;
        };
        u.id        = token.id       as string;
        u.name      = token.name     as string | null;
        u.hasAvatar = token.hasAvatar as boolean ?? false;
      }
      return session;
    },
  },
};
