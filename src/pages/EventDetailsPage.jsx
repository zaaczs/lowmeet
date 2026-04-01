import { Link, useParams } from "react-router-dom";
import { CalendarClock, MapPinned, UserRound } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppData } from "../context/AppDataContext";

function EventDetailsPage() {
  const { eventId } = useParams();
  const { events } = useAppData();
  const event = events.find((item) => item.id === eventId);
  const ticketInfo =
    event?.ticketType === "paid"
      ? `Entrada: R$ ${Number(event.ticketPrice || 0).toFixed(2).replace(".", ",")}`
      : "Entrada: gratuita";
  const addressInfo =
    event?.location ||
    `${event?.street || ""}, ${event?.number || ""}${
      event?.complement ? ` - ${event.complement}` : ""
    }`;

  if (!event) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Evento não encontrado</h1>
        <Link to="/eventos">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="h-72 w-full overflow-hidden rounded-2xl md:h-96">
        <img
          src={event.image}
          alt={event.name}
          className="h-full w-full object-cover"
          style={{
            transform: `translateY(${event.heroImageOffsetY ?? 0}%) scale(${event.heroImageScale ?? 1})`,
            transformOrigin: "center center",
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{event.type}</Badge>
        {event.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            #{tag}
          </Badge>
        ))}
      </div>
      <h1 className="text-3xl font-bold">{event.name}</h1>
      <p className="max-w-3xl text-muted-foreground">{event.description}</p>

      <Card>
        <CardContent className="space-y-2 pt-5 text-sm">
          <p className="flex items-center gap-2">
            <CalendarClock size={15} />
            {new Date(event.datetime).toLocaleString("pt-BR")}
          </p>
          <p className="flex items-center gap-2">
            <MapPinned size={15} />
            {addressInfo}
          </p>
          <p>
            {ticketInfo}
          </p>
          <p className="flex items-center gap-2">
            <UserRound size={15} />
            Organizador: {event.organizerName}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default EventDetailsPage;
