import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import EventList from "../components/events/EventList";
import SearchAutocomplete from "../components/common/SearchAutocomplete";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useSearchSuggestions } from "../hooks/useSearchSuggestions";
import BannerCarousel from "../components/banners/BannerCarousel";

function HomePage() {
  const { approvedEvents } = useAppData();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const featured = useMemo(() => approvedEvents.slice(0, 3), [approvedEvents]);
  const suggestions = useSearchSuggestions(approvedEvents, query);
  const publishTarget = user ? "/criar-evento" : "/login";

  return (
    <div className="space-y-8">
      <BannerCarousel position="home-top" />

      <section className="grid gap-6 rounded-2xl border bg-white p-6 shadow-soft md:grid-cols-2">
        <div className="space-y-4">
          <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Plataforma moderna de encontros automotivos
          </p>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Descubra, crie e monetize eventos automotivos com o LowMeet
          </h1>
          <p className="text-muted-foreground">
            Estrutura escalável para organizadores, visitantes e parceiros com
            descoberta inteligente e dashboard administrativo.
          </p>
          <div className="flex gap-3">
            <Link to="/eventos">
              <Button size="lg">Explorar eventos</Button>
            </Link>
            <Link to={publishTarget}>
              <Button size="lg" variant="outline">
                Publicar evento
              </Button>
            </Link>
          </div>
          <SearchAutocomplete
            query={query}
            onChange={setQuery}
            suggestions={suggestions}
          />
        </div>
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80"
          alt="Carros modificados em evento"
          className="h-72 w-full rounded-xl object-cover md:h-full"
        />
      </section>

      <BannerCarousel position="home-middle" />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Eventos em destaque</h2>
          <Link to="/eventos" className="text-sm font-medium text-primary">
            Ver todos
          </Link>
        </div>
        <EventList events={featured} />
      </section>

      <BannerCarousel position="home-bottom" />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Patrocinadores e parceiros</h2>
          <Link to="/patrocinadores" className="text-sm font-medium text-primary">
            Ver todos
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Marcas que apoiam o LowMeet e ajudam a fortalecer os eventos automotivos da
          comunidade.
        </p>
      </section>
    </div>
  );
}

export default HomePage;
