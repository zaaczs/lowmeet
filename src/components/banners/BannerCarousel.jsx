import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Card } from "../ui/card";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";

const SPONSOR_WHATSAPP_LINK =
  "https://wa.me/5585997732508?text=Ol%C3%A1%2C%20quero%20reservar%20o%20banner%20da%20minha%20cidade%20no%20LowMeet.";

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function BannerCarousel({ position = "topo", compact = false, currentState = "", currentCity = "" }) {
  const { banners, registerBannerClick } = useAppData();
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const resolvedState = String(currentState || user?.state || "").trim().toUpperCase();
  const resolvedCity = String(currentCity || user?.city || "").trim();
  const hasCityTargeting = Boolean(resolvedState && resolvedCity);
  const cityKey = normalizeTextKey(resolvedCity);
  const stateKey = normalizeTextKey(resolvedState);

  const byPosition = useMemo(
    () => banners.filter((banner) => banner.active && banner.position === position),
    [banners, position]
  );

  const filtered = useMemo(
    () => {
      if (!hasCityTargeting) {
        return byPosition;
      }

      const cityBanners = byPosition.filter((banner) => {
        const level = banner.targetingLevel || "NATIONAL";
        if (level !== "CITY") return false;
        return (
          normalizeTextKey(banner.state) === stateKey &&
          normalizeTextKey(banner.city) === cityKey
        );
      });
      if (cityBanners.length > 0) return cityBanners;

      const stateBanners = byPosition.filter((banner) => {
        const level = banner.targetingLevel || "NATIONAL";
        return level === "STATE" && normalizeTextKey(banner.state) === stateKey;
      });
      if (stateBanners.length > 0) return stateBanners;

      return byPosition.filter((banner) => (banner.targetingLevel || "NATIONAL") === "NATIONAL");
    },
    [byPosition, cityKey, hasCityTargeting, stateKey]
  );
  const shouldShowCityPlaceholder = hasCityTargeting && filtered.length === 0;
  const placeholderTemplate = byPosition[0] ?? null;
  const previewType = String(placeholderTemplate?.type || "oficina").toUpperCase();
  const previewBrand = String(placeholderTemplate?.brandName || "TurboMax Performance");

  useEffect(() => {
    setIndex(0);
  }, [position, filtered.length, resolvedCity, resolvedState]);

  useEffect(() => {
    if (filtered.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % filtered.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [filtered.length]);

  if (shouldShowCityPlaceholder) {
    return (
      <a href={SPONSOR_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="group block">
        <Card className="overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl">
          <div
            className={`relative ${compact ? "h-28" : "h-40 md:h-48"} w-full overflow-hidden bg-slate-100`}
          >
            {placeholderTemplate?.image && (
              <img
                src={placeholderTemplate.image}
                alt="Banner disponível para patrocinador"
                className="h-full w-full object-cover opacity-25 blur-[1.5px] transition-transform duration-500 group-hover:scale-105"
                style={{ objectPosition: `center ${Number(placeholderTemplate.focusY ?? 50)}%` }}
              />
            )}
            <div className="absolute inset-0 bg-black/70 transition-colors duration-300 group-hover:bg-black/55" />
            <div className="absolute left-4 top-4 text-white/85">
              <p className="text-[10px] uppercase tracking-widest">{previewType}</p>
              <p className="text-sm font-semibold">{previewBrand}</p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
              <Lock
                size={20}
                aria-hidden="true"
                className="mb-2 transition-transform duration-300 group-hover:scale-110"
              />
              <p className="text-sm font-semibold md:text-base">
                Banner disponível para patrocinador em {resolvedCity} - {resolvedState}
              </p>
              <p className="mt-1 text-xs md:text-sm opacity-95">
                Clique para ser um patrocinador e reservar este espaço.
              </p>
            </div>
          </div>
        </Card>
      </a>
    );
  }

  if (!filtered.length) return null;

  const current = filtered[index % filtered.length];

  return (
    <a
      href={current.link}
      target="_blank"
      rel="noreferrer"
      className="group block"
      onClick={() => registerBannerClick(current.id)}
    >
      <Card className="overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl">
        <div
          className={`relative ${compact ? "h-28" : "h-40 md:h-48"} w-full overflow-hidden`}
        >
          <img
            src={current.image}
            alt={`Banner ${current.brandName}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: `center ${Number(current.focusY ?? 50)}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent p-4 text-white transition-opacity duration-300 group-hover:opacity-90">
            <p className="text-xs uppercase tracking-wide">{current.type}</p>
            <p className="text-base font-semibold">{current.brandName}</p>
          </div>
        </div>
      </Card>
    </a>
  );
}

export default BannerCarousel;
