import { Handshake, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import GuestLocationSelector from "../components/common/GuestLocationSelector";
import { useAppData } from "../context/AppDataContext";
import { useGuestLocation } from "../hooks/useGuestLocation";

const whatsappLink =
  "https://wa.me/5585997732508?text=Opaa%21%20Quero%20me%20tornar%20um%20patrocinador%20Oficial%20do%20Sistema%20LowMeet";
const citySponsorWhatsappLink =
  "https://wa.me/5585997732508?text=Ol%C3%A1%2C%20quero%20reservar%20o%20banner%20da%20minha%20cidade%20no%20LowMeet.";

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function SponsorsPage() {
  const { banners } = useAppData();
  const {
    effectiveState,
    effectiveCity,
    saveGuestLocation,
  } = useGuestLocation();
  const activeBanners = banners.filter((banner) => banner.active);
  const resolvedState = String(effectiveState || "").trim().toUpperCase();
  const resolvedCity = String(effectiveCity || "").trim();
  const hasCityTargeting = Boolean(resolvedState && resolvedCity);
  const stateKey = normalizeTextKey(resolvedState);
  const cityKey = normalizeTextKey(resolvedCity);
  const citySponsors = activeBanners.filter(
    (banner) =>
      normalizeTextKey(banner.state) === stateKey &&
      normalizeTextKey(banner.city) === cityKey
  );
  const hasCitySponsor = citySponsors.length > 0;
  const shouldShowCityPlaceholder = hasCityTargeting && !hasCitySponsor;

  const allSponsors = Array.from(
    new Map(
      activeBanners.map((banner) => [banner.brandName, banner])
    ).values()
  );
  const citySponsorsUnique = Array.from(
    new Map(citySponsors.map((banner) => [banner.brandName, banner])).values()
  );
  const sponsors = hasCityTargeting && hasCitySponsor ? citySponsorsUnique : allSponsors;

  return (
    <div className="space-y-6">
      <GuestLocationSelector
        stateValue={effectiveState}
        cityValue={effectiveCity}
        onSaveLocation={saveGuestLocation}
      />
      <div className="flex items-center gap-2">
        <Handshake size={24} className="text-primary" />
        <h1 className="text-3xl font-bold">Patrocinadores e parceiros</h1>
      </div>

      <p className="max-w-4xl text-sm text-muted-foreground">
        Conheça as marcas que fortalecem o LowMeet e ajudam a cena automotiva a crescer.
        Cada parceiro contribui com história, estrutura e apoio para os eventos da
        comunidade.
      </p>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sponsors.map((sponsor) => {
          const sponsorCard = (
            <Card
              key={sponsor.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                shouldShowCityPlaceholder ? "group-hover:-translate-y-0.5 group-hover:shadow-xl" : ""
              }`}
            >
              <img
                src={sponsor.image}
                alt={`Patrocinador ${sponsor.brandName}`}
                className={`h-44 w-full object-cover transition-transform duration-500 ${
                  shouldShowCityPlaceholder ? "opacity-30 blur-[1.5px] group-hover:scale-105" : ""
                }`}
              />
              <CardHeader className={`space-y-1 ${shouldShowCityPlaceholder ? "opacity-45" : ""}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {sponsor.type}
                </p>
                <CardTitle>{sponsor.brandName}</CardTitle>
              </CardHeader>
              <CardContent className={`space-y-3 ${shouldShowCityPlaceholder ? "opacity-45" : ""}`}>
                <p className="text-sm text-muted-foreground">{sponsor.story}</p>
                {shouldShowCityPlaceholder ? (
                  <span className="inline-flex text-sm font-medium text-primary/70">
                    Conhecer parceiro
                  </span>
                ) : (
                  <a
                    href={sponsor.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    Conhecer parceiro
                  </a>
                )}
              </CardContent>
              {shouldShowCityPlaceholder && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/65 px-4 text-center text-white transition-colors duration-300 group-hover:bg-black/55">
                  <Lock
                    size={18}
                    aria-hidden="true"
                    className="mb-1.5 transition-transform duration-300 group-hover:scale-110"
                  />
                  <p className="text-xs font-semibold leading-tight transition-colors duration-300 group-hover:text-white md:text-sm">
                    Banner disponível para patrocinador em {resolvedCity} - {resolvedState}
                  </p>
                  <p className="mt-1 text-[11px] leading-tight opacity-95 transition-colors duration-300 group-hover:text-white md:text-xs">
                    Clique para ser um patrocinador e reservar este espaço.
                  </p>
                </div>
              )}
            </Card>
          );

          if (!shouldShowCityPlaceholder) return sponsorCard;
          return (
            <a
              key={`locked-${sponsor.id}`}
              href={citySponsorWhatsappLink}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              {sponsorCard}
            </a>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t pt-4">
        <p className="text-sm font-medium text-slate-700">Quer se tornar um patrocinador?</p>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Entrar em contato pelo WhatsApp"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.198.297-.767.965-.94 1.164-.174.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.787-1.48-1.76-1.653-2.058-.174-.297-.019-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.075-.793.372-.272.298-1.04 1.016-1.04 2.48 0 1.463 1.065 2.877 1.213 3.075.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.625.711.226 1.359.194 1.87.118.57-.085 1.758-.718 2.006-1.412.248-.694.248-1.289.173-1.412-.074-.124-.272-.198-.57-.347m-5.421 7.036h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.454 4.438-9.89 9.894-9.89 2.644 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.893 7.003c-.003 5.454-4.438 9.89-9.893 9.89" />
          </svg>
          Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}

export default SponsorsPage;
