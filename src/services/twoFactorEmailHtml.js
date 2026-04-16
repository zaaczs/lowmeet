/**
 * HTML do e-mail 2FA (mesmo layout do webhook/send-2fa-server.js).
 * Usado pelo EmailJS com {{{ html_content }}} no template.
 */
function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTwoFactorEmailHtml(code, message) {
  const safeMessage = escapeHtml(message || "Use este código para concluir o acesso.");
  const safeCode = escapeHtml(String(code ?? "").trim());

  return `
        <div style="margin:0; padding:24px; background:#f1f5f9; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0;">
            <tr>
              <td>
                <img
                  src="https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1400&q=80"
                  alt="Carro esportivo LowMeet"
                  width="640"
                  style="display:block; width:100%; height:220px; object-fit:cover;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 10px; font-size:12px; letter-spacing:1px; color:#ef4444; font-weight:700;">
                  LOWMEET SECURITY
                </p>
                <h1 style="margin:0 0 10px; font-size:26px; line-height:1.2;">
                  Seu código de verificação chegou!
                </h1>
                <p style="margin:0 0 18px; font-size:15px; color:#475569;">
                  Recebemos uma solicitação para entrar na sua conta LowMeet.
                  Se foi você, use o código abaixo para concluir com segurança.
                </p>

                <div style="margin:18px 0; border:1px dashed #cbd5e1; border-radius:12px; padding:16px; background:#f8fafc; text-align:center;">
                  <p style="margin:0 0 8px; font-size:12px; color:#64748b;">CÓDIGO DE ACESSO</p>
                  <p style="margin:0; font-size:36px; font-weight:800; letter-spacing:10px; color:#0f172a;">
                    ${safeCode}
                  </p>
                </div>

                <p style="margin:0 0 8px; font-size:14px; color:#334155;">
                  ${safeMessage}
                </p>
                <p style="margin:0; font-size:13px; color:#64748b;">
                  Não compartilhe este código com ninguém. Ele expira em 10 minutos.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px; border-top:1px solid #e2e8f0; background:#f8fafc;">
                <p style="margin:0; font-size:12px; color:#64748b;">
                  LowMeet - Plataforma de eventos automotivos
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;
}
