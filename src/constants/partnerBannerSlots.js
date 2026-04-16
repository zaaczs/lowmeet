/**
 * Ordem fixa dos 6 espaços de patrocínio por estado/cidade (painel admin + vitrine).
 */
export const PARTNER_BANNER_SLOT_POSITIONS = [
  "home-top",
  "home-middle",
  "home-bottom",
  "events-top",
  "events-after-calendar",
  "events-bottom",
];

export function slugCityKeyForBannerSlot(city) {
  const base = String(city || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase()
    .slice(0, 48);
  return base || "cidade";
}
