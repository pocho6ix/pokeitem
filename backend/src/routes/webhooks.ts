import { Router, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";

/**
 * Webhook routes.
 *
 * ⚠️ Stripe requires the raw request body for signature verification, so
 * `server.ts` mounts this router BEFORE `express.json()`. We apply
 * `express.raw({ type: "application/json" })` here per route.
 */
const router = Router();

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  });
}

function getPeriodEnd(sub: Stripe.Subscription): Date {
  // In newer Stripe API versions, current_period_end moved to SubscriptionItem.
  const item = sub.items?.data?.[0];
  if (item && (item as Stripe.SubscriptionItem & { current_period_end?: number }).current_period_end) {
    return new Date(
      (item as Stripe.SubscriptionItem & { current_period_end: number }).current_period_end * 1000
    );
  }
  return new Date((sub.billing_cycle_anchor + 31 * 24 * 60 * 60) * 1000);
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// ─── POST /api/webhooks/stripe ────────────────────────────────
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return res.status(400).json({ error: "Signature manquante" });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("stripe webhook verify failed:", err);
      return res.status(400).json({ error: "Signature invalide" });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          if (!userId || !session.subscription) break;

          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const periodEnd = getPeriodEnd(sub);

          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "PRO",
              stripeCustomerId:
                typeof session.customer === "string" ? session.customer : undefined,
              stripeSubscriptionId: sub.id,
              planExpiresAt: periodEnd,
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            },
          });

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan: "PRO",
              source: "stripe",
              status: "active",
              currentPeriodEnd: periodEnd,
            },
            update: { plan: "PRO", status: "active", currentPeriodEnd: periodEnd },
          });
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId: sub.id },
          });
          if (!user) break;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: "FREE",
              planExpiresAt: null,
              stripeSubscriptionId: null,
              trialEndsAt: null,
            },
          });
          await prisma.subscription.updateMany({
            where: { userId: user.id },
            data: { status: "canceled" },
          });
          break;
        }

        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId: sub.id },
          });
          if (!user) break;
          const periodEnd = getPeriodEnd(sub);
          const isActive = sub.status === "active" || sub.status === "trialing";
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: isActive ? "PRO" : "FREE",
              planExpiresAt: periodEnd,
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            },
          });
          break;
        }

        default:
          // No-op for untracked events.
          break;
      }
      res.json({ received: true });
    } catch (error) {
      console.error("stripe webhook handler error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// ─── POST /api/webhooks/brevo ─────────────────────────────────
// Handles unsubscribe / hard_bounce / invalid_email events → flip the
// user's newsletter flag. Accepts single-object or array payloads.
router.post(
  "/brevo",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const secret = process.env.BREVO_WEBHOOK_SECRET;
      if (secret) {
        const incoming = req.headers["x-brevo-webhook-secret"];
        if (incoming !== secret) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      const events: Array<{ event?: string; email?: string }> = Array.isArray(parsed)
        ? (parsed as Array<{ event?: string; email?: string }>)
        : [parsed as { event?: string; email?: string }];

      for (const evt of events) {
        const { event, email } = evt;
        if (!email) continue;

        if (event === "unsubscribe" || event === "hard_bounce" || event === "invalid_email") {
          await prisma.user.updateMany({
            where: { email },
            data: {
              subscribedNewsletter: false,
              unsubscribedAt: new Date(),
            },
          });
        }
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("[Brevo webhook] error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/webhooks/revenuecat ────────────────────────────
// TODO: Phase 4 — iOS/Android subscription events from RevenueCat.
router.post(
  "/revenuecat",
  express.raw({ type: "application/json" }),
  async (_req: Request, res: Response) => {
    res.status(501).json({ error: "Not implemented yet — Phase 4 (iOS)" });
  }
);

export default router;
