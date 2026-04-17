export { coreProductionUsers as mockUsers } from "./coreUsers";

export const mockPendingApprovalEvents = [];

export const mockEvents = [];

export const mockStressTestEvents = [];

/** Seis parceiros de referência — imagens em /public/banners (mesma origem do app; sem CDN externa). */
export const PARTNER_SHOWCASE_BANNER_IDS = ["bn-1", "bn-2", "bn-3", "bn-4", "bn-5", "bn-6"];

export function showcaseBannerImageUrl(bannerId) {
  const base = String(import.meta.env.BASE_URL || "/");
  return `${base}banners/${bannerId}.jpg`;
}

export function syncShowcaseBannerLocalImages(banners) {
  const ids = new Set(PARTNER_SHOWCASE_BANNER_IDS);
  return banners.map((banner) =>
    ids.has(banner.id) ? { ...banner, image: showcaseBannerImageUrl(banner.id) } : banner
  );
}

export const mockBanners = [
  {
    id: "bn-1",
    brandName: "TurboMax Performance",
    type: "oficina",
    image: showcaseBannerImageUrl("bn-1"),
    link: "https://instagram.com",
    position: "home-top",
    targetingLevel: "NATIONAL",
    state: "CE",
    city: "Fortaleza",
    focusY: 42,
    active: true,
    slotReleased: false,
    story:
      "A TurboMax nasceu da paixão por preparação turbo e acerto fino para projetos de rua e pista. Hoje é referência em performance confiável.",
  },
  {
    id: "bn-2",
    brandName: "DT Garage Store",
    type: "loja",
    image: showcaseBannerImageUrl("bn-2"),
    link: "https://wa.me/5511999999999",
    position: "home-middle",
    targetingLevel: "NATIONAL",
    state: "CE",
    city: "Fortaleza",
    focusY: 48,
    active: true,
    slotReleased: false,
    story:
      "A DT Garage Store começou como uma pequena loja de acessórios e virou ponto de encontro de quem busca peças, estilo e suporte para projetos custom.",
  },
  {
    id: "bn-3",
    brandName: "Morbus Estética",
    type: "estética automotiva",
    image: showcaseBannerImageUrl("bn-3"),
    link: "https://example.com",
    position: "home-bottom",
    targetingLevel: "NATIONAL",
    state: "CE",
    city: "Fortaleza",
    focusY: 40,
    active: true,
    slotReleased: false,
    story:
      "A Morbus Estética atua no ecossistema automotivo apoiando eventos e iniciativas da comunidade, conectando marcas e apaixonados por carros.",
  },
  {
    id: "bn-4",
    brandName: "Américo Pneus",
    type: "loja de pneus",
    image: showcaseBannerImageUrl("bn-4"),
    link: "https://instagram.com",
    position: "events-top",
    targetingLevel: "NATIONAL",
    state: "CE",
    city: "Fortaleza",
    focusY: 45,
    active: true,
    slotReleased: false,
    story:
      "A Américo Pneus é focada em manutenção especializada e upgrades para veículos esportivos, com histórico forte em track days e encontros técnicos.",
  },
  {
    id: "bn-5",
    brandName: "Street Customs",
    type: "customização de carros",
    image: showcaseBannerImageUrl("bn-5"),
    link: "https://example.com",
    position: "events-bottom",
    targetingLevel: "NATIONAL",
    state: "CE",
    city: "Fortaleza",
    focusY: 52,
    active: true,
    slotReleased: false,
    story:
      "A Street Customs construiu sua história transformando carros comuns em projetos únicos, valorizando acabamento premium e identidade visual.",
  },
  {
    id: "bn-6",
    brandName: "West Sons",
    type: "som automotivo",
    image: showcaseBannerImageUrl("bn-6"),
    link: "https://instagram.com",
    position: "events-after-calendar",
    targetingLevel: "NATIONAL",
    state: "CE",
    city: "Fortaleza",
    focusY: 38,
    active: true,
    slotReleased: false,
    story:
      "A West Sons promove ativações com marcas e encontros temáticos, trazendo experiências para o público logo após o calendário de eventos.",
  },
];

export function getPartnerShowcaseGridBanners() {
  return PARTNER_SHOWCASE_BANNER_IDS.map((id) => mockBanners.find((b) => b.id === id)).filter(Boolean);
}

export function getPartnerShowcaseBannerForPosition(position) {
  return (
    mockBanners.find(
      (b) => PARTNER_SHOWCASE_BANNER_IDS.includes(b.id) && b.position === position
    ) ?? null
  );
}
