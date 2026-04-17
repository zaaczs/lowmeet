import { Heart } from "lucide-react";
import EventList from "../components/events/EventList";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppData } from "../context/AppDataContext";

function FavoritesPage() {
  const { favoriteEvents } = useAppData();

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center gap-2">
        <Heart className="shrink-0 text-primary" size={22} />
        <h1 className="break-words text-2xl font-bold sm:text-3xl">Meus favoritos</h1>
      </div>

      {favoriteEvents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum evento favoritado ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Favoritar eventos ajuda você a montar sua lista pessoal para acompanhar os
            encontros que mais interessam.
          </CardContent>
        </Card>
      ) : (
        <EventList events={favoriteEvents} />
      )}
    </div>
  );
}

export default FavoritesPage;
