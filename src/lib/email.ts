export async function sendVerificationEmail(email: string, token: string) {
  const { Resend } = await import("resend");
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const resend = new Resend(key);
  const FROM_EMAIL = process.env.EMAIL_FROM ?? "PokeItem <noreply@pokeitem.fr>";
  const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr";
  const verifyUrl = `${BASE_URL}/verification?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Vérifiez votre adresse email — PokeItem",
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">PokeItem</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;">Confirmez votre adresse email</h2>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
                Bienvenue sur PokeItem ! Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
                      Vérifier mon email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#a1a1aa;font-size:13px;line-height:1.5;">
                Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte sur PokeItem, ignorez cet email.
              </p>
              <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">
                ${verifyUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
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
</html>
    `.trim(),
  });
}
