import React, { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./CalendarioEncontros.css";

export default function CalendarioEncontros({ eventos }) {
  const [modal, setModal] = useState({ open: false, evento: null });

  // Transforma eventos para o formato do FullCalendar
  const eventosFC = eventos.map((ev, idx) => ({
    id: String(idx),
    title: ev.nome,
    start: ev.data + "T" + ev.horario,
    extendedProps: ev,
  }));

  function handleEventClick(info) {
    setModal({ open: true, evento: info.event.extendedProps });
  }

  function closeModal() {
    setModal({ open: false, evento: null });
  }

  return (
    <div className="calendario-encontros-container">
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
      {modal.open && (
        <div className="modal-bg" onClick={closeModal}>
          <div className="modal-evento" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>
              ×
            </button>
            <h2>{modal.evento.nome}</h2>
            <p>
              <b>Data:</b> {modal.evento.data} às {modal.evento.horario}
            </p>
            <p>
              <b>Local:</b> {modal.evento.rua}, {modal.evento.bairro},{" "}
              {modal.evento.cidade} - {modal.evento.estado}, {modal.evento.cep}
            </p>
            <p>
              <b>Organizadores:</b> {modal.evento.organizadores}
            </p>
            <p>
              <b>Tipo/Clube:</b> {modal.evento.tipo}
            </p>
            <p>
              <b>Informações:</b> {modal.evento.info}
            </p>
            {modal.evento.folderUrl && (
              <img
                src={modal.evento.folderUrl}
                alt="Folder do Evento"
                style={{
                  maxWidth: "100%",
                  borderRadius: "8px",
                  marginTop: "1rem",
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
