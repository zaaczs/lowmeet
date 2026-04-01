import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

function NotFoundPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">
        O endereço informado não existe ou foi movido.
      </p>
      <Link to="/">
        <Button>Voltar para home</Button>
      </Link>
    </div>
  );
}

export default NotFoundPage;
