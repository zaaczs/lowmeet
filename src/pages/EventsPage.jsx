import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventFilters from "../components/events/EventFilters";
import EventList from "../components/events/EventList";
import EventCalendar from "../components/events/EventCalendar";
import BannerCarousel from "../components/banners/BannerCarousel";
import { Button } from "../components/ui/button";
import { useAppData } from "../context/AppDataContext";
import { useBrazilLocations } from "../hooks/useBrazilLocations";
import { useGuestLocation } from "../hooks/useGuestLocation";

const DEFAULT_EVENT_TYPES = ["Encontro", "Track Day", "Exposição", "Arrancada"];

function EventsPage() {
  const { approvedEvents, filterEvents, seedTestEvents } = useAppData();
  const navigate = useNavigate();
  const [draftFilters, setDraftFilters] = useState({
    query: "",
    state: "",
    city: "",
    type: "",
    year: "",
    month: "",
    day: "",
  });
  const [filters, setFilters] = useState({
    query: "",
    state: "",
    city: "",
    type: "",
    year: "",
    month: "",
    day: "",
  });
  const [seedFeedback, setSeedFeedback] = useState("");
  const { effectiveState, effectiveCity } = useGuestLocation();
  const [hasAppliedInitialLocation, setHasAppliedInitialLocation] = useState(false);

  const { stateOptions, cityOptions, loadingStates, loadingCities } = useBrazilLocations(
    draftFilters.state
  );
  const states = useMemo(() => stateOptions, [stateOptions]);
  const cities = useMemo(() => cityOptions, [cityOptions]);
  const types = useMemo(() => {
    const dynamicTypes = approvedEvents.map((event) => event.type).filter(Boolean);
    return Array.from(new Set([...DEFAULT_EVENT_TYPES, ...dynamicTypes]));
  }, [approvedEvents]);
  const years = useMemo(() => {
    const dynamicYears = approvedEvents
      .map((event) => String(new Date(event.datetime).getFullYear()))
      .filter(Boolean);
    const uniqueYears = Array.from(new Set(dynamicYears));
    return uniqueYears.sort((a, b) => Number(b) - Number(a));
  }, [approvedEvents]);

  const filtered = useMemo(
    () => filterEvents(filters).filter((event) => event.status === "approved"),
    [filterEvents, filters]
  );

  const calendarSelectedMonth = useMemo(() => {
    if (!filters.month) return "";
    if (filters.year) return `${filters.year}-${filters.month}`;

    const firstFilteredInMonth = filtered.find((event) => {
      const [eventYear, eventMonth] = String(event.datetime).split("T")[0].split("-");
      return Boolean(eventYear) && eventMonth === filters.month;
    });

    const fallbackYear = firstFilteredInMonth
      ? String(firstFilteredInMonth.datetime).slice(0, 4)
      : String(new Date().getFullYear());

    return `${fallbackYear}-${filters.month}`;
  }, [filters.month, filters.year, filtered]);

  const handleFilterChange = (field, value) =>
    setDraftFilters((prev) =>
      field === "state" ? { ...prev, state: value, city: "" } : { ...prev, [field]: value }
    );

  const applyFilters = () => {
    setFilters(draftFilters);
  };

  const handleSeedTestEvents = () => {
    seedTestEvents();
    setSeedFeedback("Eventos de teste adicionados com sucesso.");
    setTimeout(() => setSeedFeedback(""), 2000);
  };

  useEffect(() => {
    if (hasAppliedInitialLocation) return;
    if (!effectiveState || !effectiveCity) return;

    setDraftFilters((prev) => ({ ...prev, state: effectiveState, city: effectiveCity }));
    setFilters((prev) => ({ ...prev, state: effectiveState, city: effectiveCity }));
    setHasAppliedInitialLocation(true);
  }, [effectiveCity, effectiveState, hasAppliedInitialLocation]);

  return (
    <div className="space-y-6">
      <BannerCarousel position="events-top" currentState={effectiveState} currentCity={effectiveCity} />
      <div className="space-y-6">
        <section className="space-y-3">
          <h1 className="text-2xl font-bold sm:text-3xl">Eventos e calendário</h1>
          <EventFilters
            filters={draftFilters}
            onChange={handleFilterChange}
            states={states}
            cities={cities}
            types={types}
            years={years}
            loadingStates={loadingStates}
            loadingCities={loadingCities}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {seedFeedback && <p className="text-xs text-emerald-600">{seedFeedback}</p>}
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleSeedTestEvents}>
              Inserir eventos de teste
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={applyFilters}>
              Aplicar filtros
            </Button>
          </div>
        </section>

        <EventCalendar
          events={filtered}
          selectedMonth={calendarSelectedMonth}
          onPickEvent={(event) => navigate(`/eventos/${event.id}`)}
        />
        <BannerCarousel
          position="events-after-calendar"
          currentState={effectiveState}
          currentCity={effectiveCity}
        />

        <EventList events={filtered} itemsPerPage={12} showNameSearch />
      </div>
      <BannerCarousel position="events-bottom" currentState={effectiveState} currentCity={effectiveCity} />
    </div>
  );
}

export default EventsPage;
