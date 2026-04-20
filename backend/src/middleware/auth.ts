import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "";

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
  };
}

/**
 * Extract user from:
 * 1. Authorization: Bearer <token> (mobile / Capacitor)
 * 2. NextAuth JWT cookie (web, during transition period)
 *
 * Sets req.userId and req.user if valid.
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let userId: string | null = null;

    // 1. Check Bearer token first (mobile flow)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        type: string;
      };
      if (payload.type === "mobile" || payload.type === "api") {
        userId = payload.userId;
      }
    }

    // 2. Fallback: NextAuth session-token cookie (web)
    if (!userId) {
      const cookieToken =
        req.cookies?.["next-auth.session-token"] ||
        req.cookies?.["__Secure-next-auth.session-token"];

      if (cookieToken) {
        try {
          const payload = jwt.verify(cookieToken, JWT_SECRET) as {
            sub?: string;
            id?: string;
          };
          userId = payload.sub || payload.id || null;
        } catch {
          // Cookie JWT invalid or expired — continue unauthenticated
        }
      }
    }

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, plan: true, deletedAt: true },
      });

      if (user && !user.deletedAt) {
        req.userId = user.id;
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        };
      }
    }

    next();
  } catch {
    // Auth failed silently — route handler decides if auth is required
    next();
  }
}

/**
 * Require authentication — returns 401 if no valid user.
 * Use after authMiddleware.
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  next();
}
