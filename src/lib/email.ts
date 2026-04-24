import {
  getBrevoClient,
  getUsersListId,
  getNewsletterListId,
  getBrevoSender,
  getTemplateIds,
} from "@/lib/brevo"

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr"

function unsubscribeUrl(email: string) {
  return `${BASE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}`
}

// ─── Env var check (logs missing vars on first use) ──────────────────────────

function checkEnvVars() {
  const required = [
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "BREVO_SENDER_NAME",
    "BREVO_TEMPLATE_VERIFY_EMAIL",
    "BREVO_TEMPLATE_WELCOME",
    "BREVO_TEMPLATE_RESET_PASSWORD",
    "BREVO_LIST_ID_USERS",
    "BREVO_LIST_ID_NEWSLETTER",
  ]
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`[Brevo] ❌ Variable manquante : ${key}`)
    }
  }
}

// ─── Transactional emails ─────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string) {
  checkEnvVars()
  const verifyUrl = `${BASE_URL}/verification?token=${token}`
  const client = getBrevoClient()
  const { verifyEmail } = getTemplateIds()

  console.log("[Brevo] sendVerificationEmail → templateId:", verifyEmail, "to:", email)
  await client.transactionalEmails.sendTransacEmail({
    templateId: verifyEmail,
    sender: getBrevoSender(),
    to: [{ email }],
    params: { VERIFY_URL: verifyUrl, unsubscribeUrl: unsubscribeUrl(email) },
  })
}

export async function sendWelcomeEmail(email: string, name?: string | null) {
  checkEnvVars()
  const client = getBrevoClient()
  const firstName = name?.split(" ")[0] ?? "Dresseur"
  const { welcome } = getTemplateIds()

  console.log("[Brevo] sendWelcomeEmail → templateId:", welcome, "to:", email, "FIRSTNAME:", firstName)
  await client.transactionalEmails.sendTransacEmail({
    templateId: welcome,
    sender: getBrevoSender(),
    to: [{ email }],
    params: { PSEUDO: firstName, APP_URL: "https://app.pokeitem.fr/portfolio", unsubscribeUrl: unsubscribeUrl(email) },
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  checkEnvVars()
  const resetUrl = `${BASE_URL}/reinitialiser-mot-de-passe?token=${token}`
  const client = getBrevoClient()
  const { resetPassword } = getTemplateIds()

  console.log("[Brevo] sendPasswordResetEmail → templateId:", resetPassword, "to:", email)
  await client.transactionalEmails.sendTransacEmail({
    templateId: resetPassword,
    sender: getBrevoSender(),
    to: [{ email }],
    params: { RESET_URL: resetUrl, unsubscribeUrl: unsubscribeUrl(email) },
  })
}

// ─── CRM contact management ───────────────────────────────────────────────────

// Only users who opted into marketing communications are stored in Brevo.
// Unsubscribed users are removed entirely rather than left in a "users"
// list with the newsletter list unlinked — the previous behavior leaked
// opt-outs into the CRM and inflated the contact count.
//
// Transactional emails (verify, welcome, reset) do not require a Brevo
// contact to exist — they're sent directly to the `to:` address — so
// skipping the upsert for opt-outs has no effect on critical mail flows.

export async function upsertBrevoContact(
  email: string,
  opts: {
    name?: string | null
    subscribed?: boolean
  } = {}
) {
  const subscribed = opts.subscribed ?? true

  if (!subscribed) {
    await deleteBrevoContact(email)
    return
  }

  const client = getBrevoClient()
  const usersListId = getUsersListId()
  const newsletterListId = getNewsletterListId()
  const listIds = [usersListId, newsletterListId]

  try {
    await client.contacts.createContact({
      email,
      attributes: {
        FIRSTNAME: opts.name ?? undefined,
        POKEITEM_USER: true,
      } as Record<string, string | number | boolean | string[]>,
      listIds,
      updateEnabled: true,
    })
  } catch (err) {
    try {
      await client.contacts.updateContact({
        identifier: email,
        attributes: {
          FIRSTNAME: opts.name ?? undefined,
          POKEITEM_USER: true,
        } as Record<string, string | number | boolean | string[]>,
        listIds,
      })
    } catch (updateErr) {
      console.error("[Brevo] Failed to upsert contact:", updateErr)
    }
  }
}

// Brevo's deleteContact is a no-op when the identifier doesn't exist
// (returns 404) — swallow it so "never-subscribed" users don't log noise.
async function deleteBrevoContact(email: string) {
  try {
    await getBrevoClient().contacts.deleteContact({ identifier: email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/404|not\s*found/i.test(msg)) return
    console.error("[Brevo] Failed to delete contact:", msg)
  }
}

export async function unsubscribeContact(email: string) {
  await deleteBrevoContact(email)
}
