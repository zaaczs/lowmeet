import { Input } from "../ui/input";
import { Select } from "../ui/select";

const MONTH_OPTIONS = [
  { value: "", label: "Todos os meses" },
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function EventFilters({
  filters,
  onChange,
  states = [],
  cities = [],
  types = [],
  years = [],
  loadingStates = false,
  loadingCities = false,
  className = "",
}) {
  const dayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));

  return (
    <div className={`grid gap-3 md:grid-cols-2 xl:grid-cols-7 ${className}`}>
      <Input
        placeholder="Buscar por nome, tipo, estado ou cidade"
        value={filters.query}
        onChange={(event) => onChange("query", event.target.value)}
      />
      <Select
        value={filters.state}
        onChange={(event) => onChange("state", event.target.value)}
      >
        <option value="">
          {loadingStates ? "Carregando estados..." : "Todos os estados"}
        </option>
        {states.map((state) => (
          <option key={state.value} value={state.value}>
            {state.label}
          </option>
        ))}
      </Select>
      <Select
        value={filters.city}
        onChange={(event) => onChange("city", event.target.value)}
        disabled={!filters.state}
      >
        <option value="">
          {!filters.state
            ? "Selecione um estado"
            : loadingCities
              ? "Carregando cidades..."
              : "Todas as cidades"}
        </option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </Select>
      <Select value={filters.type} onChange={(event) => onChange("type", event.target.value)}>
        <option value="">Todos os tipos</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </Select>
      <Select value={filters.month} onChange={(event) => onChange("month", event.target.value)}>
        {MONTH_OPTIONS.map((month) => (
          <option key={month.value || "all"} value={month.value}>
            {month.label}
          </option>
        ))}
      </Select>
      <Select value={filters.year} onChange={(event) => onChange("year", event.target.value)}>
        <option value="">Todos os anos</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </Select>
      <Select value={filters.day} onChange={(event) => onChange("day", event.target.value)}>
        <option value="">Qualquer dia</option>
        {dayOptions.map((day) => (
          <option key={day} value={day}>
            Dia {day}
          </option>
        ))}
      </Select>
    </div>
  );
}

export default EventFilters;
