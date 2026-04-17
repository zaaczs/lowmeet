import { coreProductionUsers } from "../services/coreUsers";

const STORAGE_USERS = "lowmeet_users";
const STORAGE_SESSION = "lowmeet_session";
const STORAGE_EVENTS = "lowmeet_events";
const STORAGE_FAVORITES = "lowmeet_favorites_by_user";
const STORAGE_NOTIFICATIONS = "lowmeet_notifications_by_user";
const STORAGE_BANNER_CLICKS = "lowmeet_banner_clicks";
const STORAGE_2FA = "lowmeet_2fa_codes";
const VERSION_KEY = "lowmeet_production_data_version";

/** Incrementar quando for necessário rodar nova limpeza em todos os navegadores. */
export const LOWMEET_PRODUCTION_DATA_VERSION = 1;

function normEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

const allowlist = new Set(coreProductionUsers.map((u) => normEmail(u.email)));

/**
 * Migração única: mantém apenas os e-mails de `coreProductionUsers`, zera eventos e dados
 * derivados (favoritos, notificações, cliques em banner, 2FA pendente). Preserva senhas e
 * ids existentes quando o usuário já estava salvo no navegador.
 */
export function runProductionResetIfNeeded() {
  try {
    const current = Number(localStorage.getItem(VERSION_KEY) || "0");
    if (current >= LOWMEET_PRODUCTION_DATA_VERSION) return;

    let stored = [];
    const rawUsers = localStorage.getItem(STORAGE_USERS);
    if (rawUsers) {
      try {
        const parsed = JSON.parse(rawUsers);
        stored = Array.isArray(parsed) ? parsed : [];
      } catch {
        stored = [];
      }
    }

    const byEmail = new Map(stored.map((u) => [normEmail(u.email), u]));

    const merged = coreProductionUsers.map((template) => {
      const existing = byEmail.get(normEmail(template.email));
      if (!existing) {
        return { ...template };
      }
      const emailKey = normEmail(template.email);
      const base = {
        ...template,
        ...existing,
        id: existing.id,
        password: existing.password,
        email: existing.email || template.email,
      };
      if (emailKey === "lowmeetlowmeet@gmail.com") {
        return { ...base, role: "ADMIN", name: "Isaac Ramos" };
      }
      if (emailKey === "pablotr756@gmail.com") {
        return {
          ...base,
          role: "ORGANIZADOR",
          organizerScopeState: String(
            existing.organizerScopeState || template.organizerScopeState || "CE"
          )
            .trim()
            .toUpperCase(),
          organizerScopeCity: String(existing.organizerScopeCity ?? template.organizerScopeCity ?? "").trim(),
        };
      }
      return base;
    });

    localStorage.setItem(STORAGE_USERS, JSON.stringify(merged));
    localStorage.setItem(STORAGE_EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify({}));
    localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify({}));
    localStorage.setItem(STORAGE_BANNER_CLICKS, JSON.stringify({}));
    localStorage.removeItem(STORAGE_2FA);

    const sessionRaw = localStorage.getItem(STORAGE_SESSION);
    if (sessionRaw) {
      try {
        const sessionUser = JSON.parse(sessionRaw);
        if (!allowlist.has(normEmail(sessionUser?.email))) {
          localStorage.removeItem(STORAGE_SESSION);
        }
      } catch {
        localStorage.removeItem(STORAGE_SESSION);
      }
    }

    localStorage.setItem(VERSION_KEY, String(LOWMEET_PRODUCTION_DATA_VERSION));
  } catch (error) {
    console.error("LowMeet: falha na migração de dados de produção", error);
  }
}
