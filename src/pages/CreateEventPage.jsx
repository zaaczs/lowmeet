import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppData } from "../context/AppDataContext";
import { useBrazilLocations } from "../hooks/useBrazilLocations";
import { processImageUpload } from "../lib/imageProcessing";

const eventTypes = ["Encontro", "Track Day", "Exposição", "Arrancada"];
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function CreateEventPage() {
  const { createEvent } = useAppData();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    type: "",
    description: "",
    datetime: "",
    city: "",
    state: "",
    street: "",
    number: "",
    complement: "",
    ticketType: "free",
    ticketPrice: "",
    image: "",
    cardImageScale: 1,
    cardImageOffsetY: 0,
    heroImageScale: 1,
    heroImageOffsetY: 0,
  });
  const [message, setMessage] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageInfo, setImageInfo] = useState(null);
  const [imageError, setImageError] = useState("");
  const { stateOptions, cityOptions, loadingStates, loadingCities } = useBrazilLocations(
    form.state
  );

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const getLocationLabel = () => {
    const street = form.street.trim();
    const number = form.number.trim();
    const complement = form.complement.trim();
    const base = `${street}, ${number}`;
    return complement ? `${base} - ${complement}` : base;
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setImageError("");
    setImageProcessing(true);
    try {
      const result = await processImageUpload(file, {
        maxWidth: 1920,
        quality: 0.92,
      });
      setField("image", result.dataUrl);
      setImageInfo({ width: result.width, height: result.height });
      setField("cardImageScale", 1);
      setField("cardImageOffsetY", 0);
      setField("heroImageScale", 1);
      setField("heroImageOffsetY", 0);
    } catch (error) {
      setImageError(error.message || "Não foi possível processar a imagem.");
      setField("image", "");
      setImageInfo(null);
    } finally {
      setImageProcessing(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsedPrice =
      form.ticketType === "paid" ? Number(String(form.ticketPrice).replace(",", ".")) : null;

    if (form.ticketType === "paid" && (!parsedPrice || parsedPrice <= 0)) {
      setMessage("Informe um valor de entrada válido para eventos pagos.");
      return;
    }

    try {
      const created = createEvent({
        ...form,
        location: getLocationLabel(),
        ticketPrice: parsedPrice,
        cardImageScale: Number(form.cardImageScale) || 1,
        cardImageOffsetY: Number(form.cardImageOffsetY) || 0,
        heroImageScale: Number(form.heroImageScale) || 1,
        heroImageOffsetY: Number(form.heroImageOffsetY) || 0,
        tags: [],
        image:
          form.image ||
          "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1200&q=80",
      });
      setMessage(
        created.status === "approved"
          ? "Evento publicado com sucesso."
          : "Evento criado e enviado para aprovação do admin."
      );
      setTimeout(() => navigate("/eventos"), 1200);
    } catch (error) {
      setMessage(error.message || "Não foi possível criar o evento.");
    }
  };

  return (
    <Card className="mx-auto w-full min-w-0 max-w-3xl">
      <CardHeader>
        <CardTitle>Criar novo evento</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input
            placeholder="Nome do evento"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            required
          />
          <Select
            value={form.type}
            onChange={(event) => setField("type", event.target.value)}
            required
          >
            <option value="">Tipo do evento</option>
            {eventTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input
            type="datetime-local"
            value={form.datetime}
            onChange={(event) => setField("datetime", event.target.value)}
            required
          />
          <Select
            value={form.state}
            onChange={(event) => {
              setField("state", event.target.value);
              setField("city", "");
            }}
            required
          >
            <option value="">{loadingStates ? "Carregando estados..." : "Estado"}</option>
            {stateOptions.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </Select>
          <Select
            value={form.city}
            onChange={(event) => setField("city", event.target.value)}
            disabled={!form.state}
            required
          >
            <option value="">
              {!form.state
                ? "Selecione um estado primeiro"
                : loadingCities
                  ? "Carregando cidades..."
                  : "Cidade"}
            </option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Rua / Avenida"
            value={form.street}
            onChange={(event) => setField("street", event.target.value)}
            required
          />
          <Input
            placeholder="Número"
            value={form.number}
            onChange={(event) => setField("number", event.target.value)}
            required
          />
          <Input
            placeholder="Complemento (opcional)"
            value={form.complement}
            onChange={(event) => setField("complement", event.target.value)}
          />
          <Select
            value={form.ticketType}
            onChange={(event) => {
              setField("ticketType", event.target.value);
              if (event.target.value === "free") {
                setField("ticketPrice", "");
              }
            }}
            required
          >
            <option value="free">Entrada gratuita</option>
            <option value="paid">Entrada paga</option>
          </Select>
          {form.ticketType === "paid" && (
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="Valor da entrada (R$)"
              value={form.ticketPrice}
              onChange={(event) => setField("ticketPrice", event.target.value)}
              required
            />
          )}
          <div className="space-y-2 md:col-span-2">
            <Input
              type="file"
              accept="image/*,.heic,.heif"
              onChange={(event) => handleImageUpload(event.target.files?.[0])}
            />
            <p className="text-xs text-muted-foreground">
              Upload automático em qualidade equilibrada (até 1920px), com bom equilíbrio entre
              nitidez e tamanho do arquivo.
            </p>
            <p className="text-xs text-muted-foreground">
              Recomendações: capa (cards) 1200x750 e imagem principal 1920x800.
              Se a proporção for diferente, a qualidade visual pode reduzir.
            </p>
            {imageProcessing && (
              <p className="text-xs text-muted-foreground">Processando imagem...</p>
            )}
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
            {imageInfo && (
              <p className="text-xs text-muted-foreground">
                Dimensão final: {imageInfo.width} x {imageInfo.height}
              </p>
            )}
          </div>
          {form.image && (
            <div className="space-y-4 rounded-xl border p-3 md:col-span-2">
              <p className="text-sm font-medium">Ajuste de enquadramento da imagem</p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Capa do evento (lista/cards)
                  </p>
                  <div className="aspect-[8/5] overflow-hidden rounded-lg border bg-slate-100">
                    <img
                      src={form.image}
                      alt="Preview capa do evento"
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `center ${clamp(50 + Number(form.cardImageOffsetY), 0, 100)}%`,
                        transform: `scale(${form.cardImageScale})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Zoom capa: {Number(form.cardImageScale).toFixed(2)}x
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={form.cardImageScale}
                      onChange={(event) => setField("cardImageScale", event.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Posição vertical da capa: {form.cardImageOffsetY}%
                    </label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={form.cardImageOffsetY}
                      onChange={(event) => setField("cardImageOffsetY", event.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Imagem principal (página do evento)
                  </p>
                  <div className="aspect-[12/5] overflow-hidden rounded-lg border bg-slate-100">
                    <img
                      src={form.image}
                      alt="Preview imagem principal do evento"
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `center ${clamp(50 + Number(form.heroImageOffsetY), 0, 100)}%`,
                        transform: `scale(${form.heroImageScale})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Zoom principal: {Number(form.heroImageScale).toFixed(2)}x
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={form.heroImageScale}
                      onChange={(event) => setField("heroImageScale", event.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Posição vertical principal: {form.heroImageOffsetY}%
                    </label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={form.heroImageOffsetY}
                      onChange={(event) => setField("heroImageOffsetY", event.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <textarea
            className="md:col-span-2 min-h-28 rounded-lg border bg-white px-3 py-2 text-sm"
            placeholder="Descrição do evento"
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            required
          />
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit">Salvar evento</Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default CreateEventPage;
