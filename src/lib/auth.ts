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
      if (user) {
        token.id    = user.id;
        token.image = user.image ?? null;
        token.name  = user.name  ?? null;
      }
      // Called when update() is invoked client-side (avatar / name change)
      if (trigger === "update") {
        if (session?.image !== undefined) token.image = session.image;
        if (session?.name  !== undefined) token.name  = session.name;
      }
      // For sessions issued before image/name were stored in the token,
      // fetch fresh values from DB once (token.image will be undefined, not null)
      if (token.id && token.image === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { image: true, name: true },
        });
        token.image = dbUser?.image ?? null;
        if (token.name === undefined) token.name = dbUser?.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; image?: string | null; name?: string | null }).id    = token.id    as string;
        (session.user as { id: string; image?: string | null; name?: string | null }).image = token.image as string | null;
        (session.user as { id: string; image?: string | null; name?: string | null }).name  = token.name  as string | null;
      }
      return session;
    },
  },
};
