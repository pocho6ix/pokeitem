import { Router, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../middleware/auth";

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
router.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: { plan: true, planExpiresAt: true, stripeCustomerId: true, stripeSubscriptionId: true },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(user);
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
