import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { useAppData } from "../../context/AppDataContext";

function BannerCarousel({ position = "topo", compact = false }) {
  const { banners, registerBannerClick } = useAppData();
  const [index, setIndex] = useState(0);

  const filtered = useMemo(
    () => banners.filter((banner) => banner.active && banner.position === position),
    [banners, position]
  );

  useEffect(() => {
    if (filtered.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % filtered.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [filtered.length]);

  if (!filtered.length) return null;

  const current = filtered[index % filtered.length];

  return (
    <a
      href={current.link}
      target="_blank"
      rel="noreferrer"
      className="block"
      onClick={() => registerBannerClick(current.id)}
    >
      <Card className="overflow-hidden">
        <div
          className={`relative ${compact ? "h-28" : "h-40 md:h-48"} w-full overflow-hidden`}
        >
          <img
            src={current.image}
            alt={`Banner ${current.brandName}`}
            className="h-full w-full object-cover"
            style={{ objectPosition: `center ${Number(current.focusY ?? 50)}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent p-4 text-white">
            <p className="text-xs uppercase tracking-wide">{current.type}</p>
            <p className="text-base font-semibold">{current.brandName}</p>
          </div>
        </div>
      </Card>
    </a>
  );
}

export default BannerCarousel;
