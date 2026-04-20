import { Router, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";

/**
 * Webhook routes.
 *
 * ⚠️ These routes need the raw request body for signature verification, so
 * `server.ts` mounts this router BEFORE `express.json()`. We apply
 * `express.raw({ type: "application/json" })` here per route — do NOT add
 * `express.json()` globally above.
 */
const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// ─── POST /api/webhooks/stripe ────────────────────────────────
// TODO: Flesh out `customer.subscription.updated/deleted`, `invoice.paid`,
// etc. Copy from src/app/api/webhooks/stripe/route.ts.
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
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
          if (session.client_reference_id) {
            await prisma.user.update({
              where: { id: session.client_reference_id },
              data: {
                plan:                 "PRO",
                stripeCustomerId:     typeof session.customer     === "string" ? session.customer     : undefined,
                stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
              },
            });
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          // TODO: flip plan → FREE on deleted, update planExpiresAt on updated.
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
// TODO: Copy logic from src/app/api/webhooks/brevo/route.ts (unsubscribe,
// hard-bounce → flag user.emailVerified=false, etc.).
router.post(
  "/brevo",
  express.raw({ type: "application/json" }),
  async (_req: Request, res: Response) => {
    res.status(501).json({ error: "Not implemented yet — logique à copier" });
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
