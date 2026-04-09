import {
  getBrevoClient,
  getUsersListId,
  getNewsletterListId,
  BREVO_SENDER,
  TEMPLATE_IDS,
} from "@/lib/brevo"

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr"

// ─── Shared email layout (fallback for non-template sends) ───────────────────

function emailLayout(body: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#BF953F,#FCF6BA,#B38728,#FBF5B7,#AA771C);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#1A1A1A;font-size:24px;font-weight:700;">PokeItem</h1>
            </td>
          </tr>
          ${body}
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">&copy; ${new Date().getFullYear()} PokeItem. Tous droits réservés.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

// ─── Transactional emails ─────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${BASE_URL}/verification?token=${token}`
  const client = getBrevoClient()

  await client.transactionalEmails.sendTransacEmail({
    templateId: TEMPLATE_IDS.verifyEmail,
    sender: BREVO_SENDER,
    to: [{ email }],
    params: { VERIFY_URL: verifyUrl },
  })
}

export async function sendWelcomeEmail(email: string, name?: string | null) {
  const client = getBrevoClient()
  const firstName = name?.split(" ")[0] ?? "Dresseur"

  await client.transactionalEmails.sendTransacEmail({
    templateId: TEMPLATE_IDS.welcome,
    sender: BREVO_SENDER,
    to: [{ email }],
    params: { FIRSTNAME: firstName, APP_URL: BASE_URL },
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${BASE_URL}/reinitialiser-mot-de-passe?token=${token}`
  const client = getBrevoClient()

  // No dedicated template yet — use inline HTML
  await client.transactionalEmails.sendTransacEmail({
    subject: "Réinitialisation de votre mot de passe — PokeItem",
    sender: BREVO_SENDER,
    to: [{ email }],
    htmlContent: emailLayout(`
      <tr>
        <td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Réinitialiser votre mot de passe</h2>
          <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#BF953F,#FCF6BA,#B38728,#FBF5B7,#AA771C);color:#1A1A1A;padding:12px 32px;border-radius:999px;font-size:15px;font-weight:700;text-decoration:none;">
                  Réinitialiser mon mot de passe
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;color:#a1a1aa;font-size:13px;line-height:1.5;">
            Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.
          </p>
          <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">
            ${resetUrl}
          </p>
        </td>
      </tr>`),
  })
}

// ─── CRM contact management ───────────────────────────────────────────────────

export async function upsertBrevoContact(
  email: string,
  opts: {
    name?: string | null
    /** Whether the contact should be on the newsletter list (default: true) */
    subscribed?: boolean
  } = {}
) {
  const client = getBrevoClient()
  const usersListId = getUsersListId()
  const newsletterListId = getNewsletterListId()
  const subscribed = opts.subscribed ?? true

  // Always add to users list; newsletter list depends on consent
  const listIds = subscribed
    ? [usersListId, newsletterListId]
    : [usersListId]
  const unlinkListIds = subscribed ? [] : [newsletterListId]

  try {
    await client.contacts.createContact({
      email,
      attributes: {
        FIRSTNAME: opts.name ?? undefined,
        POKEITEM_USER: true,
      } as Record<string, string | number | boolean | string[]>,
      listIds,
      updateEnabled: true, // upsert
    })
  } catch (err) {
    // Fallback to explicit update if create/upsert fails
    try {
      await client.contacts.updateContact({
        identifier: email,
        attributes: {
          FIRSTNAME: opts.name ?? undefined,
          POKEITEM_USER: true,
        } as Record<string, string | number | boolean | string[]>,
        listIds,
        unlinkListIds,
      })
    } catch (updateErr) {
      console.error("[Brevo] Failed to upsert contact:", updateErr)
    }
  }
}

export async function unsubscribeContact(email: string) {
  await upsertBrevoContact(email, { subscribed: false })
}
