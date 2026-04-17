import { Link } from "react-router-dom";
import { Input } from "../ui/input";
import { Card } from "../ui/card";

function SearchAutocomplete({ query, onChange, suggestions = [] }) {
  return (
    <div className="relative">
      <Input
        placeholder="Busque eventos por nome, tipo ou cidade"
        value={query}
        onChange={(event) => onChange(event.target.value)}
      />
      {query.length >= 2 && suggestions.length > 0 && (
        <Card className="absolute z-30 mt-2 max-h-[min(70vh,24rem)] w-full overflow-y-auto overflow-x-hidden border bg-white shadow-md">
          <div className="divide-y">
            {suggestions.map((event) => (
              <Link
                key={event.id}
                to={`/eventos/${event.id}`}
                className="block min-w-0 px-3 py-2 text-sm hover:bg-muted"
              >
                <p className="break-words font-medium">{event.name}</p>
                <p className="text-xs text-muted-foreground">
                  {event.type} - {event.city}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default SearchAutocomplete;
