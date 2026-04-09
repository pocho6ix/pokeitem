import { BrevoClient } from "@getbrevo/brevo"

export function getBrevoClient(): BrevoClient {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error("BREVO_API_KEY is not configured")
  return new BrevoClient({ apiKey: key })
}

// List IDs configured in Brevo dashboard
export function getUsersListId(): number {
  const id = parseInt(process.env.BREVO_LIST_ID_USERS ?? "2", 10)
  return isNaN(id) ? 2 : id
}

export function getNewsletterListId(): number {
  const id = parseInt(process.env.BREVO_LIST_ID_NEWSLETTER ?? "3", 10)
  return isNaN(id) ? 3 : id
}

// Sender
export const BREVO_SENDER = {
  email: process.env.BREVO_SENDER_EMAIL ?? "contact@pokeitem.fr",
  name: process.env.BREVO_SENDER_NAME ?? "PokeItem",
}

// Template IDs
export const TEMPLATE_IDS = {
  verifyEmail: parseInt(process.env.BREVO_TEMPLATE_VERIFY_EMAIL ?? "1", 10),
  welcome: parseInt(process.env.BREVO_TEMPLATE_WELCOME ?? "2", 10),
}
