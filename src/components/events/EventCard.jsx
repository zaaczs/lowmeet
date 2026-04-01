import { Calendar, Heart, MapPin, Share2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import ShareEventModal from "./ShareEventModal";

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EventCard({ event }) {
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite } = useAppData();
  const isFavorite = favoriteIds.includes(event.id);
  const [shareOpen, setShareOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const ticketInfo =
    event.ticketType === "paid"
      ? `Entrada R$ ${Number(event.ticketPrice || 0).toFixed(2).replace(".", ",")}`
      : "Entrada gratuita";

  const handleFavoriteClick = () => {
    if (!user) {
      navigate("/login", {
        state: {
          next: location.pathname,
          favoriteEventId: event.id,
        },
      });
      return;
    }
    toggleFavorite(event.id);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-44 w-full overflow-hidden">
          <img
            src={event.image}
            alt={event.name}
            className="h-full w-full object-cover"
            style={{
              transform: `translateY(${event.cardImageOffsetY ?? 0}%) scale(${event.cardImageScale ?? 1})`,
              transformOrigin: "center center",
            }}
          />
        </div>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{event.name}</CardTitle>
            <Badge variant={event.status === "approved" ? "default" : "secondary"}>
              {event.status === "approved" ? "Aprovado" : "Pendente"}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{event.type}</Badge>
            {event.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          <div className="space-y-1 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Calendar size={14} /> {formatDate(event.datetime)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={14} /> {event.city} - {event.state}
            </p>
            <p>{ticketInfo}</p>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Link to={`/eventos/${event.id}`} className="w-full">
            <Button variant="outline" className="w-full">
              Ver detalhes
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 size={14} />
          </Button>
          <Button variant={isFavorite ? "default" : "ghost"} size="sm" onClick={handleFavoriteClick}>
            <Heart size={14} />
          </Button>
        </CardFooter>
      </Card>
      <ShareEventModal event={event} open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}

export default EventCard;
