import { Router, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { FREE_LIMITS } from "../lib/subscription";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

// ─── POST /api/subscription/checkout ──────────────────────────
router.post("/checkout", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { interval } = req.body as { interval?: "month" | "year" };
    const priceId = interval === "year"
      ? process.env.STRIPE_PRO_PRICE_ID_ANNUAL
      : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) return res.status(500).json({ error: "Price ID non configuré" });

    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const session = await stripe.checkout.sessions.create({
      mode:        "subscription",
      line_items:  [{ price: priceId, quantity: 1 }],
      customer:    user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      success_url: `${process.env.NEXTAUTH_URL}/pricing?success=true`,
      cancel_url:  `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("subscription/checkout error:", error);
    res.status(500).json({ error: "Erreur lors du checkout" });
  }
});

// ─── GET /api/subscription/status ─────────────────────────────
// Shape mirrors `src/app/api/subscription/status/route.ts` (web) so the
// iOS useSubscription() hook reads `isPro` / `isTrialing` / `usage`
// exactly like on the web. Returning the raw DB columns made every
// gated UI on iOS (Premium banner, limit badges, trade tab lock) think
// the user was FREE even on a paid Pro plan.
router.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { _count: { select: { userCards: true, portfolio: true } } },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const isTrialing = !!(user.trialEndsAt && new Date(user.trialEndsAt) > new Date());
    const isPro = isTrialing || (
      user.plan === "PRO" &&
      (!user.planExpiresAt || new Date(user.planExpiresAt) > new Date())
    );

    const now = new Date();
    const resetAt = new Date(user.scanCountResetAt);
    const isNewMonth =
      now.getMonth() !== resetAt.getMonth() ||
      now.getFullYear() !== resetAt.getFullYear();
    const scanCount = isNewMonth ? 0 : user.scanCount;

    res.json({
      isPro,
      isTrialing,
      trialEndsAt: user.trialEndsAt ?? null,
      betaTrialUsed: !!user.betaTrialActivatedAt,
      plan: isPro ? "PRO" : "FREE",
      planExpiresAt: user.planExpiresAt,
      cancelAtPeriodEnd: false,
      usage: {
        cards:       { current: user._count.userCards, limit: isPro ? null : FREE_LIMITS.CARDS },
        sealedItems: { current: user._count.portfolio, limit: isPro ? null : FREE_LIMITS.SEALED_ITEMS },
        scans:       { current: scanCount,             limit: isPro ? null : FREE_LIMITS.SCANS_PER_MONTH },
      },
    });
  } catch (error) {
    console.error("subscription/status error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/subscription/cancel ────────────────────────────
router.post("/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: { stripeSubscriptionId: true },
    });
    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({ error: "Aucun abonnement actif" });
    }
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("subscription/cancel error:", error);
    res.status(500).json({ error: "Erreur lors de l'annulation" });
  }
});

// ─── POST /api/subscription/portal ────────────────────────────
router.post("/portal", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: "Aucun client Stripe" });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/profil`,
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("subscription/portal error:", error);
    res.status(500).json({ error: "Erreur lors de l'ouverture du portail" });
  }
});

export default router;
