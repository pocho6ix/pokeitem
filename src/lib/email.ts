import {
  getBrevoClient,
  getUsersListId,
  getNewsletterListId,
  getBrevoSender,
  getTemplateIds,
} from "@/lib/brevo"

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr"

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
    params: { VERIFY_URL: verifyUrl },
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
    params: { FIRSTNAME: firstName, APP_URL: BASE_URL },
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
    params: { RESET_URL: resetUrl },
  })
}

// ─── CRM contact management ───────────────────────────────────────────────────

export async function upsertBrevoContact(
  email: string,
  opts: {
    name?: string | null
    subscribed?: boolean
  } = {}
) {
  const client = getBrevoClient()
  const usersListId = getUsersListId()
  const newsletterListId = getNewsletterListId()
  const subscribed = opts.subscribed ?? true

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
