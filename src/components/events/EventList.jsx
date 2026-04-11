import { useEffect, useMemo, useState } from "react";
import EventCard from "./EventCard";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function EventList({ events, itemsPerPage = 0, showNameSearch = false }) {
  const [nameQuery, setNameQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const normalizedNameQuery = normalizeText(nameQuery);
  const filteredByName = useMemo(() => {
    if (!showNameSearch || !normalizedNameQuery) return events;
    return events.filter((event) => normalizeText(event.name).includes(normalizedNameQuery));
  }, [events, normalizedNameQuery, showNameSearch]);

  const totalPages = useMemo(() => {
    if (!itemsPerPage || itemsPerPage <= 0) return 1;
    return Math.max(1, Math.ceil(filteredByName.length / itemsPerPage));
  }, [filteredByName.length, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedNameQuery, events.length, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const visibleEvents = useMemo(() => {
    if (!itemsPerPage || itemsPerPage <= 0) return filteredByName;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredByName.slice(start, end);
  }, [currentPage, filteredByName, itemsPerPage]);

  return (
    <div className="space-y-4">
      {showNameSearch && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Lista de eventos</p>
          <Input
            value={nameQuery}
            onChange={(event) => setNameQuery(event.target.value)}
            placeholder="Buscar eventos pelo nome"
            className="w-full sm:max-w-sm"
          />
        </div>
      )}

      {!visibleEvents.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Nenhum evento encontrado para os filtros informados.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {itemsPerPage > 0 && filteredByName.length > itemsPerPage && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            const isCurrentPage = pageNumber === currentPage;
            return (
              <Button
                key={`page-${pageNumber}`}
                type="button"
                variant={isCurrentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNumber)}
                aria-current={isCurrentPage ? "page" : undefined}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EventList;
