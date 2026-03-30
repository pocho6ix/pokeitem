import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
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
      },
      async authorize(credentials) {
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

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign-in: populate token from user object
      if (user) {
        token.id       = user.id;
        token.name     = user.name  ?? null;
        // Store only a boolean — NEVER store base64 image in JWT (cookie size limit)
        token.hasAvatar = !!user.image;
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
