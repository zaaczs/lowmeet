import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function EventCalendar({ events, onPickEvent, selectedMonth = "" }) {
  const [expandedDays, setExpandedDays] = useState({});
  const now = new Date();
  const parsedMonthDate = selectedMonth ? new Date(`${selectedMonth}-01T00:00:00`) : now;
  const isValidMonth = !Number.isNaN(parsedMonthDate.getTime());
  const baseDate = isValidMonth ? parsedMonthDate : now;
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const monthEvents = useMemo(
    () =>
      events.reduce((acc, event) => {
        const date = new Date(event.datetime);
        if (date.getMonth() !== month || date.getFullYear() !== year) return acc;
        const day = date.getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(event);
        return acc;
      }, {}),
    [events, month, year]
  );

  const matrix = getMonthMatrix(year, month);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
  const totalInMonth = Object.values(monthEvents).reduce((acc, dayItems) => acc + dayItems.length, 0);

  const toggleDayExpanded = (day) => {
    if (!day) return;
    setExpandedDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-white to-primary/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Calendário de eventos - {monthLabel}</CardTitle>
          <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {totalInMonth} evento(s) no mês
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="-mx-2 overflow-x-auto overscroll-x-contain px-2 pb-1 [touch-action:pan-x]">
          <div className="min-w-[42rem] space-y-2">
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="space-y-2">
              {matrix.map((week, index) => (
                <div key={index} className="grid grid-cols-7 gap-2">
                  {week.map((day, cellIndex) => {
                    const items = day ? monthEvents[day] ?? [] : [];
                    const isExpanded = Boolean(expandedDays[day]);
                    const visibleItems = isExpanded ? items : items.slice(0, 2);
                    const hiddenCount = items.length - visibleItems.length;
                    return (
                      <div
                        key={`${index}-${cellIndex}`}
                        className={`min-h-24 rounded-xl border p-2 transition-colors ${
                          day ? "bg-white hover:border-primary/40" : "bg-slate-50/60"
                        }`}
                      >
                        {day && (
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-xs font-semibold">{day}</p>
                            {items.length > 0 && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                {items.length}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="space-y-1">
                          {visibleItems.map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              title={`${event.name} - ${event.city}`}
                              className="w-full truncate rounded-md border border-primary/20 bg-primary/10 px-1.5 py-1 text-left text-[10px] font-medium text-primary"
                              onClick={() => onPickEvent?.(event)}
                            >
                              {new Date(event.datetime).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              - {event.name}
                            </button>
                          ))}
                          {hiddenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleDayExpanded(day)}
                              className="w-full rounded-md border border-dashed border-slate-300 px-1.5 py-1 text-left text-[10px] font-medium text-slate-600 hover:border-primary/40 hover:text-primary"
                            >
                              Ver mais {hiddenCount} evento(s)
                            </button>
                          )}
                          {items.length > 2 && isExpanded && (
                            <button
                              type="button"
                              onClick={() => toggleDayExpanded(day)}
                              className="w-full rounded-md px-1.5 py-1 text-left text-[10px] font-medium text-slate-500 hover:text-primary"
                            >
                              Ver menos
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EventCalendar;
