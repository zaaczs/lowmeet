const WHATSAPP_BASE = "https://wa.me/5585997732508";

function waLink(message) {
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
}

/** Visitante sem cidade/estado: quer patrocínio ou entender o desbloqueio. */
export const WHATSAPP_SEM_LOCALIZACAO = waLink(
  "Olá! Estou no LowMeet sem definir minha cidade e estado ainda. Quero conversar sobre patrocínio ou banner na minha região."
);

/** Já tem local, mas não há patrocinador cadastrado na cidade. */
export const WHATSAPP_RESERVA_BANNER_CIDADE = waLink(
  "Olá, quero reservar o banner / patrocínio do LowMeet na minha cidade."
);

export const WHATSAPP_PATROCINADOR_OFICIAL = waLink(
  "Opaa! Quero me tornar um patrocinador Oficial do Sistema LowMeet"
);
