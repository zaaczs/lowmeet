import { Handshake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppData } from "../context/AppDataContext";

const whatsappLink =
  "https://wa.me/5585997732508?text=Opaa%21%20Quero%20me%20tornar%20um%20patrocinador%20Oficial%20do%20Sistema%20LowMeet";

function SponsorsPage() {
  const { banners } = useAppData();

  const sponsors = Array.from(
    new Map(
      banners
        .filter((banner) => banner.active)
        .map((banner) => [banner.brandName, banner])
    ).values()
  );

  return (
    <div className="space-y-6">
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
        {sponsors.map((sponsor) => (
          <Card key={sponsor.id} className="overflow-hidden">
            <img
              src={sponsor.image}
              alt={`Patrocinador ${sponsor.brandName}`}
              className="h-44 w-full object-cover"
            />
            <CardHeader className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {sponsor.type}
              </p>
              <CardTitle>{sponsor.brandName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{sponsor.story}</p>
              <a
                href={sponsor.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Conhecer parceiro
              </a>
            </CardContent>
          </Card>
        ))}
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
