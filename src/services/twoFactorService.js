import emailjs from "@emailjs/browser";

const STORAGE_2FA_CODES = "lowmeet_2fa_codes";
const CODE_TTL_MS = 10 * 60 * 1000;

function getCodesStore() {
  const raw = localStorage.getItem(STORAGE_2FA_CODES);
  return raw ? JSON.parse(raw) : {};
}

function saveCodesStore(store) {
  localStorage.setItem(STORAGE_2FA_CODES, JSON.stringify(store));
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendTwoFactorCode(email) {
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  const store = getCodesStore();
  store[email] = { code, expiresAt };
  saveCodesStore(store);

  const webhookUrl = import.meta.env.VITE_2FA_WEBHOOK_URL;
  const emailJsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const emailJsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const emailJsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          subject: "Código de verificação - LowMeet",
          message: `Seu código de autenticação é ${code}. Válido por 10 minutos.`,
          code,
        }),
      });

      if (!response.ok) {
        let details = "";
        try {
          const payload = await response.json();
          details = payload?.details || payload?.error || "";
        } catch {
          details = "";
        }
        throw new Error(
          details
            ? `Falha ao enviar o código por e-mail: ${details}`
            : "Falha ao enviar o código por e-mail"
        );
      }
    } catch (error) {
      if (error.message?.includes("Failed to fetch")) {
        throw new Error(
          "Webhook offline. Rode `npm run dev:full` ou mantenha `npm run dev:webhook` ativo."
        );
      }
      throw error;
    }

    return { mode: "webhook" };
  }

  if (emailJsServiceId && emailJsTemplateId && emailJsPublicKey) {
    await emailjs.send(
      emailJsServiceId,
      emailJsTemplateId,
      {
        to_email: email,
        subject: "Código de verificação - LowMeet",
        message: `Seu código de autenticação é ${code}. Válido por 10 minutos.`,
        code,
      },
      { publicKey: emailJsPublicKey }
    );
    return { mode: "emailjs" };
  }

  throw new Error(
    "Envio de e-mail não configurado. Defina VITE_2FA_WEBHOOK_URL ou EMAILJS no .env."
  );
}

export function verifyTwoFactorCode(email, inputCode) {
  const store = getCodesStore();
  const entry = store[email];

  if (!entry) {
    return { ok: false, message: "Nenhum código foi solicitado para este e-mail" };
  }

  if (Date.now() > entry.expiresAt) {
    delete store[email];
    saveCodesStore(store);
    return { ok: false, message: "Código expirado. Solicite um novo código" };
  }

  if (entry.code !== String(inputCode).trim()) {
    return { ok: false, message: "Código inválido" };
  }

  delete store[email];
  saveCodesStore(store);
  return { ok: true };
}
