import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./CalendarioEncontros.css";

export default function CalendarioEncontros({ eventos }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Filtrar eventos com base no termo de busca
  const eventosFiltrados = eventos.filter((ev) => {
    const search = searchTerm.toLowerCase();
    return (
      ev.nome.toLowerCase().includes(search) ||
      ev.tipo.toLowerCase().includes(search) ||
      ev.cidade.toLowerCase().includes(search) ||
      ev.rua.toLowerCase().includes(search) ||
      ev.data.includes(search)
    );
  });

  const eventosFC = eventos.map((ev, idx) => ({
    id: String(idx),
    title: ev.nome,
    start: ev.data + "T" + ev.horario,
    extendedProps: ev,
  }));

  function handleEventClick(info) {
    alert(`Evento: ${info.event.title}`);
  }

  return (
    <div className="calendario-encontros-container">
      {/* Barra de pesquisa */}
      <div className="barra-pesquisa-container">
        <input
          type="text"
          className="barra-pesquisa"
          placeholder="Busque eventos por: Nome do Evento / Tipo / Região / Data..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(e.target.value.length > 0);
          }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)} // Oculta os resultados ao perder o foco
          onFocus={() => setShowResults(searchTerm.length > 0)} // Mostra os resultados ao focar
        />
        {showResults && (
          <div className="resultados-dropdown">
            {eventosFiltrados.length > 0 ? (
              eventosFiltrados.map((evento, idx) => (
                <div key={idx} className="resultado-item">
                  {evento.folderUrl && (
                    <img
                      src={evento.folderUrl}
                      alt="Banner do Evento"
                      className="resultado-banner"
                    />
                  )}
                  <div>
                    <h4>{evento.nome}</h4>
                    <p>
                      <b>Data:</b> {evento.data} às {evento.horario}
                    </p>
                    <p>
                      <b>Local:</b> {evento.rua}, {evento.cidade} -{" "}
                      {evento.estado}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="nenhum-resultado">Nenhum evento encontrado.</p>
            )}
          </div>
        )}
      </div>

      {/* Calendário */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="pt-br"
        events={eventosFC}
        eventClick={handleEventClick}
        height="auto"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        buttonText={{ today: "Hoje" }}
      />
    </div>
  );
}
