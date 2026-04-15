import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Card } from "../ui/card";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import { WHATSAPP_RESERVA_BANNER_CIDADE, WHATSAPP_SEM_LOCALIZACAO } from "../../constants/sponsorContactLinks";
import { SPONSOR_RESERVE_CTA } from "../../constants/sponsorCopy";
import { getPartnerShowcaseBannerForPosition } from "../../services/mockData";

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function LockedShowcaseCarousel({
  banner,
  href,
  compact,
  title,
  subtitle,
  locationLine,
}) {
  const typeLabel = String(banner?.type || "").toUpperCase();
  const brand = String(banner?.brandName || "");

  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block">
      <Card className="overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl">
        <div
          className={`relative ${compact ? "h-28" : "h-40 md:h-48"} w-full overflow-hidden bg-slate-100`}
        >
          {banner?.image ? (
            <img
              src={banner.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-30 blur-[1.5px] transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: `center ${Number(banner.focusY ?? 50)}%` }}
            />
          ) : null}
          <div className="absolute inset-0 bg-black/70 transition-colors duration-300 group-hover:bg-black/55" />
          <div className="absolute left-3 top-3 flex items-start gap-2 text-white md:left-4 md:top-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Lock size={16} aria-hidden="true" className="text-white" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/85">{typeLabel}</p>
              <p className="text-sm font-semibold leading-tight drop-shadow md:text-base">{brand}</p>
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pt-10 text-center text-white">
            <p className="text-sm font-semibold md:text-base">{title}</p>
            {locationLine ? (
              <p className="mt-0.5 text-xs font-medium text-white/90 md:text-sm">{locationLine}</p>
            ) : null}
            <p className="mt-1 max-w-md text-xs opacity-95 md:text-sm">{subtitle}</p>
          </div>
        </div>
      </Card>
    </a>
  );
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

  const filtered = useMemo(() => {
    if (!hasCityTargeting) {
      return byPosition;
    }

    return byPosition.filter((banner) => {
      return (
        normalizeTextKey(banner.state) === stateKey && normalizeTextKey(banner.city) === cityKey
      );
    });
  }, [byPosition, cityKey, hasCityTargeting, stateKey]);

  const shouldShowCityPlaceholder = hasCityTargeting && filtered.length === 0;
  const showcaseBanner = getPartnerShowcaseBannerForPosition(position);
  const placeholderTemplate = showcaseBanner ?? byPosition[0] ?? null;
  const previewType = String(placeholderTemplate?.type || "oficina").toUpperCase();
  const previewBrand = String(placeholderTemplate?.brandName || "TurboMax Performance");

  useEffect(() => {
    setIndex(0);
  }, [position, filtered.length, resolvedCity, resolvedState]);

  useEffect(() => {
    if (!hasCityTargeting || filtered.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % filtered.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [filtered.length, hasCityTargeting]);

  if (!hasCityTargeting) {
    if (!showcaseBanner) return null;
    return (
      <LockedShowcaseCarousel
        banner={showcaseBanner}
        href={WHATSAPP_SEM_LOCALIZACAO}
        compact={compact}
        title="Visualização padrão (bloqueado)"
        subtitle={SPONSOR_RESERVE_CTA}
        locationLine={null}
      />
    );
  }

  if (shouldShowCityPlaceholder) {
    return (
      <a href={WHATSAPP_RESERVA_BANNER_CIDADE} target="_blank" rel="noreferrer" className="group block">
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
                Espaço disponível para patrocinador em {resolvedCity} — {resolvedState}
              </p>
              <p className="mt-1 text-xs md:text-sm opacity-95">{SPONSOR_RESERVE_CTA}</p>
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
