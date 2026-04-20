import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { unsubscribeContact } from "../lib/email";

const router = Router();
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr";

// ─── GET /api/unsubscribe?email=xxx ───────────────────────────
// Fired from the `unsubscribeUrl` placeholder in Brevo email templates.
// Updates DB + removes contact from the Brevo newsletter list, then redirects
// back to the web app's confirmation page.
router.get("/", async (req: Request, res: Response) => {
  const raw = typeof req.query.email === "string" ? req.query.email : "";
  const email = raw.trim().toLowerCase();

  if (!email) {
    return res.redirect(`${BASE_URL}/desabonnement?status=error`);
  }

  try {
    await prisma.user.updateMany({
      where: { email },
      data:  { subscribedNewsletter: false, unsubscribedAt: new Date() },
    });

    await unsubscribeContact(email).catch(() => {});

    res.redirect(`${BASE_URL}/desabonnement?status=success`);
  } catch (error) {
    console.error("unsubscribe error:", error);
    res.redirect(`${BASE_URL}/desabonnement?status=error`);
  }
});

export default router;
