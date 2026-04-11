import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { useBrazilLocations } from "../../hooks/useBrazilLocations";

function GuestLocationSelector({
  stateValue = "",
  cityValue = "",
  onSaveLocation,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftState, setDraftState] = useState(stateValue);
  const [draftCity, setDraftCity] = useState(cityValue);
  const [error, setError] = useState("");
  const hasLocation = Boolean(stateValue && cityValue);

  useEffect(() => {
    if (isEditing) return;
    setDraftState(stateValue || "");
    setDraftCity(cityValue || "");
  }, [cityValue, isEditing, stateValue]);

  const { stateOptions, cityOptions, loadingStates, loadingCities } = useBrazilLocations(draftState);

  const helperMessage = useMemo(() => {
    if (hasLocation) {
      return `Você está vendo eventos e banners segmentados para ${cityValue} - ${stateValue}.`;
    }
    return "Para ver os eventos disponíveis no seu estado e cidade, escolha sua localização inicial (sem preencher agora, o sistema exibe banners gerais).";
  }, [cityValue, hasLocation, stateValue]);

  const shouldRenderEditor = isEditing || !hasLocation;

  const handleSave = () => {
    setError("");
    if (!draftState || !draftCity) {
      setError("Selecione estado e cidade.");
      return;
    }
    onSaveLocation?.({ state: draftState, city: draftCity });
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border bg-white/80 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <p>{helperMessage}</p>
        {hasLocation && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="font-medium text-primary underline underline-offset-2"
          >
            Não é sua cidade? alterar
          </button>
        )}
      </div>
      {shouldRenderEditor && (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Select
            value={draftState}
            onChange={(event) => {
              setDraftState(event.target.value);
              setDraftCity("");
            }}
          >
            <option value="">{loadingStates ? "Carregando estados..." : "Selecione o estado"}</option>
            {stateOptions.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </Select>
          <Select
            value={draftCity}
            onChange={(event) => setDraftCity(event.target.value)}
            disabled={!draftState || loadingCities}
          >
            <option value="">
              {!draftState
                ? "Selecione o estado primeiro"
                : loadingCities
                  ? "Carregando cidades..."
                  : "Selecione a cidade"}
            </option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" onClick={handleSave}>
            Usar cidade
          </Button>
          <p className="sm:col-span-3 text-[11px]">
            Após salvar, os banners e eventos em destaque serão ajustados para sua cidade e estado.
          </p>
          <p className="sm:col-span-3 text-[11px]">
            Quer anunciar nesta cidade?{" "}
            <a
              href="https://wa.me/5585997732508?text=Ol%C3%A1%2C%20quero%20anunciar%20nesta%20cidade%20no%20LowMeet."
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              Quero anunciar nesta cidade
            </a>{" "}
            ou <Link to="/login" className="font-medium text-primary underline underline-offset-2">criar conta</Link>.
          </p>
          {error && <p className="sm:col-span-3 text-[11px] text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default GuestLocationSelector;
