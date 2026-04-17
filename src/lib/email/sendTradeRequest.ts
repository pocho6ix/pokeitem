import { getBrevoClient, getBrevoSender } from "@/lib/brevo";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr";

export interface TradeRequestEmailCard {
  name:     string;
  imageUrl: string | null;
  rarity:   string | null;
}

export interface TradeRequestEmailPayload {
  requestId:              string;
  senderName:             string;
  senderAvatarUrl:        string | null;
  recipientEmail:         string;
  recipientName:          string;
  cardsGiven:             TradeRequestEmailCard[];
  cardsReceived:          TradeRequestEmailCard[];
  givenValueCents:        number;
  receivedValueCents:     number;
  compensationCents:      number;  // absolute magnitude
  compensationDirection:  "NONE" | "FROM_TO_TO" | "TO_TO_FROM";
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Sends the transactional "new trade request" email via Brevo.
 *
 * The HTML template is managed in the Brevo console — this function only
 * supplies the dynamic variables the template binds to. The template ID
 * lives in the env var BREVO_TEMPLATE_TRADE_REQUEST; if it's missing the
 * function no-ops (and warns in the log) so the core flow keeps working
 * while the template is still being designed.
 *
 * Variables passed to the template (see Brevo docs for `{{ params.* }}`):
 *   sender_name, sender_avatar_url, recipient_name,
 *   cards_given, cards_received           (arrays of { name, image_url, rarity })
 *   cards_given_count, cards_received_count,
 *   cards_given_value, cards_received_value  (pre-formatted €)
 *   compensation_amount, compensation_direction,
 *   trade_request_url
 */
export async function sendTradeRequestEmail(p: TradeRequestEmailPayload): Promise<boolean> {
  const templateIdRaw = process.env.BREVO_TEMPLATE_TRADE_REQUEST;
  const templateId = templateIdRaw ? parseInt(templateIdRaw, 10) : 0;
  if (!templateId) {
    console.warn("[Brevo] BREVO_TEMPLATE_TRADE_REQUEST not set — email skipped for request", p.requestId);
    return false;
  }

  const client = getBrevoClient();

  const dirParam =
    p.compensationDirection === "FROM_TO_TO" ? "sender_pays"
    : p.compensationDirection === "TO_TO_FROM" ? "recipient_pays"
    : "none";

  try {
    await client.transactionalEmails.sendTransacEmail({
      templateId,
      sender: getBrevoSender(),
      to: [{ email: p.recipientEmail, name: p.recipientName }],
      params: {
        sender_name:           p.senderName,
        sender_avatar_url:     p.senderAvatarUrl ?? "",
        recipient_name:        p.recipientName,
        cards_given:           p.cardsGiven.map((c) => ({
          name:       c.name,
          image_url:  c.imageUrl ?? "",
          rarity:     c.rarity ?? "",
        })),
        cards_received:        p.cardsReceived.map((c) => ({
          name:       c.name,
          image_url:  c.imageUrl ?? "",
          rarity:     c.rarity ?? "",
        })),
        cards_given_count:     p.cardsGiven.length,
        cards_received_count:  p.cardsReceived.length,
        cards_given_value:     formatEur(p.givenValueCents),
        cards_received_value:  formatEur(p.receivedValueCents),
        compensation_amount:   formatEur(p.compensationCents),
        compensation_direction: dirParam,
        trade_request_url:     `${BASE_URL}/echanges/recues/${p.requestId}`,
      },
    });
    return true;
  } catch (err) {
    console.error("[Brevo] sendTradeRequestEmail failed for", p.requestId, err);
    return false;
  }
}
