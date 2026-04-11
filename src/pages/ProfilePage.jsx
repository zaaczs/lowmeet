import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, CalendarCheck2, Heart, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { useBrazilLocations } from "../hooks/useBrazilLocations";

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { events, favoriteIds } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    state: "",
    city: "",
    instagram: "",
    bio: "",
    password: "",
    confirmPassword: "",
  });
  const { stateOptions, cityOptions, loadingStates, loadingCities } = useBrazilLocations(form.state);

  const isEditing = searchParams.get("tab") === "editar";
  const createdEvents = useMemo(
    () => events.filter((event) => event.organizerId === user?.id).length,
    [events, user?.id]
  );

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: user.name || "",
      state: user.state || "",
      city: user.city || "",
      instagram: user.instagram || "",
      bio: user.bio || "",
      password: "",
      confirmPassword: "",
    }));
  }, [user]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveProfile = (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.password && form.password !== form.confirmPassword) {
      setError("As senhas não conferem");
      return;
    }

    try {
      updateProfile({
        name: form.name,
        state: form.state,
        city: form.city,
        instagram: form.instagram,
        bio: form.bio,
        password: form.password || undefined,
      });
      setMessage("Perfil atualizado com sucesso.");
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setSearchParams({});
    } catch (profileError) {
      setError(profileError.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserRound size={24} className="text-primary" />
        <h1 className="text-2xl font-bold sm:text-3xl">Meu perfil</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Usuário</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{user?.name}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Favoritos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-lg font-semibold">
            <Heart size={18} className="text-primary" />
            {favoriteIds.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Eventos criados</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-lg font-semibold">
            <CalendarCheck2 size={18} className="text-primary" />
            {createdEvents}
          </CardContent>
        </Card>
      </section>

      {!isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Dados do perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">E-mail:</span> {user?.email}
            </p>
            <p>
              <span className="font-semibold">Estado:</span> {user?.state || "Não informado"}
            </p>
            <p>
              <span className="font-semibold">Cidade:</span> {user?.city || "Não informado"}
            </p>
            <p>
              <span className="font-semibold">Instagram:</span>{" "}
              {user?.instagram || "Não informado"}
            </p>
            <p>
              <span className="font-semibold">Bio:</span> {user?.bio || "Não informado"}
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setSearchParams({ tab: "editar" })}
              >
                <BadgeCheck size={14} />
                Editar perfil
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Editar perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSaveProfile}>
              <Input
                placeholder="Nome"
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                required
              />
              <Input value={user?.email || ""} disabled />
              <Select
                value={form.state}
                onChange={(event) => {
                  const nextState = event.target.value;
                  setForm((prev) => ({ ...prev, state: nextState, city: "" }));
                }}
              >
                <option value="">
                  {loadingStates ? "Carregando estados..." : "Selecione o estado"}
                </option>
                {stateOptions.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </Select>
              <Select
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
                disabled={!form.state || loadingCities}
              >
                <option value="">
                  {!form.state
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
              <Input
                placeholder="Instagram (ex: @lowmeet)"
                value={form.instagram}
                onChange={(event) => setField("instagram", event.target.value)}
              />
              <textarea
                className="md:col-span-2 min-h-24 rounded-lg border bg-white px-3 py-2 text-sm"
                placeholder="Bio"
                value={form.bio}
                onChange={(event) => setField("bio", event.target.value)}
              />
              <Input
                type="password"
                placeholder="Nova senha (opcional)"
                value={form.password}
                onChange={(event) => setField("password", event.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirmar nova senha"
                value={form.confirmPassword}
                onChange={(event) => setField("confirmPassword", event.target.value)}
              />
              {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
              {message && <p className="md:col-span-2 text-sm text-green-600">{message}</p>}
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" className="w-full sm:w-auto">Salvar alterações</Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => setSearchParams({})}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProfilePage;
