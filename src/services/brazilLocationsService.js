const API_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

export async function fetchBrazilStates() {
  const response = await fetch(`${API_BASE}/estados?orderBy=nome`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar os estados");
  }
  const data = await response.json();
  return data.map((state) => ({
    id: state.id,
    sigla: state.sigla,
    nome: state.nome,
  }));
}

export async function fetchCitiesByStateUf(uf) {
  if (!uf) return [];
  const response = await fetch(`${API_BASE}/estados/${uf}/municipios?orderBy=nome`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar as cidades");
  }
  const data = await response.json();
  return data.map((city) => city.nome);
}
