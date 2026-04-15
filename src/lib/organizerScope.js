const ROLE_ORGANIZER = "ORGANIZADOR";
const ROLE_ADMIN = "ADMIN";
const ROLE_VISITOR = "VISITANTE";

function normLoc(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Admin: sempre. Organizador: estado obrigatório em organizerScopeState;
 * se organizerScopeCity vazio = pode atuar em qualquer cidade daquele estado.
 */
export function organizerCanModerateEvent(user, event) {
  if (!user || !event) return false;
  if (user.role === ROLE_ADMIN) return true;
  if (user.role !== ROLE_ORGANIZER) return false;
  const scopeState = String(user.organizerScopeState || "").trim().toUpperCase();
  if (!scopeState) return true;
  const evState = String(event.state || "").trim().toUpperCase();
  if (evState !== scopeState) return false;
  const scopeCity = String(user.organizerScopeCity || "").trim();
  if (!scopeCity) return true;
  return normLoc(scopeCity) === normLoc(event.city);
}

export function organizerCanCreateInLocation(user, state, city) {
  if (!user) return false;
  if (user.role === ROLE_ADMIN || user.role === ROLE_VISITOR) return true;
  if (user.role !== ROLE_ORGANIZER) return false;
  return organizerCanModerateEvent(user, { state, city });
}
