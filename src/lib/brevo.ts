import { BrevoClient } from "@getbrevo/brevo"

export function getBrevoClient(): BrevoClient {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error("BREVO_API_KEY is not configured")
  return new BrevoClient({ apiKey: key })
}

// BREVO_LIST_ID: the main newsletter / user list (set in Brevo dashboard)
export function getListId(): number {
  const id = parseInt(process.env.BREVO_LIST_ID ?? "2", 10)
  return isNaN(id) ? 2 : id
}
