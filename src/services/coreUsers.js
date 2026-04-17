/**
 * Usuários reais do ambiente de produção (demais contas e dados de teste são removidos
 * pela migração em `runProductionResetIfNeeded`).
 * Roles como string para evitar import circular com AuthContext.
 */
export const coreProductionUsers = [
  {
    id: "u-admin",
    name: "Isaac Ramos",
    email: "lowmeetlowmeet@gmail.com",
    password: "admin",
    role: "ADMIN",
  },
  {
    id: "u-org-pablo",
    name: "Pablo",
    email: "pablotr756@gmail.com",
    password: "123456",
    role: "ORGANIZADOR",
    state: "CE",
    city: "",
    organizerScopeState: "CE",
    organizerScopeCity: "",
  },
  {
    id: "u-visit-isaac-jose",
    name: "isaac josé",
    email: "isaacjoseramos@gmail.com",
    password: "123456",
    role: "VISITANTE",
    state: "",
    city: "",
  },
];
