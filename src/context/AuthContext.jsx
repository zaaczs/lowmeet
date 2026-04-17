import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { runProductionResetIfNeeded } from "../lib/runProductionResetIfNeeded";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { readStoreJson, writeStoreJson } from "../lib/supabaseKvStore";
import { mockUsers } from "../services/mockData";

const STORAGE_USERS = "lowmeet_users";
const STORAGE_SESSION = "lowmeet_session";
const SUPABASE_USERS_KEY = "users";

export const ROLES = {
  ADMIN: "ADMIN",
  ORGANIZER: "ORGANIZADOR",
  VISITOR: "VISITANTE",
};

const AuthContext = createContext(null);
const ADMIN_EMAIL = "lowmeetlowmeet@gmail.com";
const ADMIN_PASSWORD = "admin";
const getNowIso = () => new Date().toISOString();
const TEST_VISITOR_USERS = [
  ...Array.from({ length: 24 }, (_, index) => ({
    id: `u-visit-test-${index + 1}`,
    name: `Visitante Teste ${index + 1}`,
    email: `visitante.teste${index + 1}@lowmeet.com`,
    password: "123456",
    role: ROLES.VISITOR,
  })),
  {
    id: "u-visit-banner-locked",
    name: "Visitante Banner Bloqueado",
    email: "teste.bloqueio.banner@lowmeet.com",
    password: "123456",
    role: ROLES.VISITOR,
    state: "CE",
    city: "Fortaleza",
  },
];

function withAccessMetrics(user) {
  return {
    ...user,
    createdAt: user.createdAt || getNowIso(),
    lastLoginAt: user.lastLoginAt ?? null,
    loginCount: Number(user.loginCount || 0),
    state: String(user.state || "").trim().toUpperCase(),
    city: String(user.city || "").trim(),
    organizerScopeState: String(user.organizerScopeState || "").trim().toUpperCase(),
    organizerScopeCity: String(user.organizerScopeCity || "").trim(),
  };
}

function buildNormalizedUsers(sourceUsers) {
  const uniqueByEmail = [];
  const seenEmails = new Set();

  sourceUsers.forEach((user) => {
    const normalizedEmail = String(user.email || "").trim().toLowerCase();
    if (!normalizedEmail || seenEmails.has(normalizedEmail)) return;
    seenEmails.add(normalizedEmail);
    uniqueByEmail.push(user);
  });

  const normalized = uniqueByEmail.map((user) => {
    if (user.email === ADMIN_EMAIL) {
      return withAccessMetrics({
        ...user,
        name: "Isaac Ramos",
        role: ROLES.ADMIN,
        password: ADMIN_PASSWORD,
      });
    }
    if (user.role === ROLES.ADMIN) {
      return withAccessMetrics({ ...user, role: ROLES.ORGANIZER });
    }
    return withAccessMetrics(user);
  });

  const usersWithTestVisitors = [...normalized];
  if (import.meta.env.DEV) {
    TEST_VISITOR_USERS.forEach((candidate) => {
      const alreadyExists = usersWithTestVisitors.some((user) => user.email === candidate.email);
      if (!alreadyExists) {
        usersWithTestVisitors.push(withAccessMetrics(candidate));
      }
    });
  }

  const hasMainAdmin = usersWithTestVisitors.some((user) => user.email === ADMIN_EMAIL);
  return hasMainAdmin
    ? usersWithTestVisitors
    : [
        ...usersWithTestVisitors,
        withAccessMetrics({
          id: "u-admin",
          name: "Isaac Ramos",
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          role: ROLES.ADMIN,
        }),
      ];
}

function getInitialUsers() {
  runProductionResetIfNeeded();
  const localUsers = localStorage.getItem(STORAGE_USERS);
  let sourceUsers = mockUsers;
  if (localUsers) {
    try {
      const parsed = JSON.parse(localUsers);
      sourceUsers = Array.isArray(parsed) ? parsed : mockUsers;
    } catch {
      sourceUsers = mockUsers;
    }
  }
  const users = buildNormalizedUsers(sourceUsers);

  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  return users;
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => getInitialUsers());
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    const parsed = withAccessMetrics(JSON.parse(raw));
    if (parsed.role === ROLES.ADMIN && parsed.email !== ADMIN_EMAIL) {
      return null;
    }
    if (parsed.email === ADMIN_EMAIL) {
      return withAccessMetrics({ ...parsed, role: ROLES.ADMIN });
    }
    return parsed;
  });
  const usersPersistReadyRef = useRef(!isSupabaseConfigured);
  const usersHydratingRef = useRef(false);
  const initialUsersRef = useRef(users);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    usersHydratingRef.current = true;

    (async () => {
      const { data, error } = await readStoreJson(SUPABASE_USERS_KEY);
      if (error) {
        console.error("LowMeet: não foi possível carregar usuários do Supabase", error);
        usersPersistReadyRef.current = true;
        usersHydratingRef.current = false;
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const normalizedUsers = buildNormalizedUsers(data);
        if (cancelled) return;
        setUsers(normalizedUsers);
        localStorage.setItem(STORAGE_USERS, JSON.stringify(normalizedUsers));
        setUser((prev) => {
          if (!prev) return null;
          const sameUser = normalizedUsers.find(
            (candidate) => candidate.id === prev.id || candidate.email === prev.email
          );
          return sameUser ? withAccessMetrics(sameUser) : null;
        });
      } else {
        await writeStoreJson(SUPABASE_USERS_KEY, initialUsersRef.current);
      }

      if (!cancelled) {
        usersPersistReadyRef.current = true;
        usersHydratingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    if (!isSupabaseConfigured) return;
    if (!usersPersistReadyRef.current || usersHydratingRef.current) return;
    writeStoreJson(SUPABASE_USERS_KEY, users).catch((error) => {
      console.error("LowMeet: não foi possível salvar usuários no Supabase", error);
    });
  }, [users]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
      return;
    }
    localStorage.removeItem(STORAGE_SESSION);
  }, [user]);

  const register = ({ name, email, password, role = ROLES.VISITOR, state = "", city = "" }) => {
    const hasEmail = users.some((candidate) => candidate.email === email);
    if (hasEmail) {
      throw new Error("E-mail já cadastrado");
    }

    const now = getNowIso();
    const newUser = {
      id: `u-${Date.now()}`,
      name,
      email,
      password,
      role,
      bio: "",
      state: state.trim().toUpperCase(),
      city: city.trim(),
      instagram: "",
      organizerScopeState: "",
      organizerScopeCity: "",
      createdAt: now,
      lastLoginAt: now,
      loginCount: 1,
    };

    setUsers((prev) => [...prev, newUser]);
    setUser(newUser);
    return newUser;
  };

  const emailExists = (email) => users.some((candidate) => candidate.email === email);

  const validateLoginCredentials = ({ email, password }) => {
    const found = users.find(
      (candidate) => candidate.email === email && candidate.password === password
    );
    if (!found) {
      throw new Error("Credenciais inválidas");
    }
    return found;
  };

  const login = ({ email, password }) => {
    const found = validateLoginCredentials({ email, password });
    const now = getNowIso();
    const nextUser = {
      ...found,
      lastLoginAt: now,
      loginCount: Number(found.loginCount || 0) + 1,
    };

    setUsers((prev) =>
      prev.map((candidate) => (candidate.id === found.id ? { ...candidate, ...nextUser } : candidate))
    );
    setUser(nextUser);
    return nextUser;
  };

  const updateProfile = ({ name, state, city, instagram, bio, password }) => {
    if (!user) throw new Error("Usuário não autenticado");

    const updates = {
      name: name?.trim() || user.name,
      state: state?.trim().toUpperCase() || "",
      city: city?.trim() || "",
      instagram: instagram?.trim() || "",
      bio: bio?.trim() || "",
    };

    if (password) {
      updates.password = password;
    }

    setUsers((prev) =>
      prev.map((candidate) =>
        candidate.id === user.id ? { ...candidate, ...updates } : candidate
      )
    );
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const createUserByAdmin = useCallback(
    ({
      name,
      email,
      password,
      role,
      state = "",
      city = "",
      organizerScopeState = "",
      organizerScopeCity = "",
    }) => {
      const trimmedName = String(name || "").trim();
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const pwd = String(password || "");
      if (!trimmedName) throw new Error("Informe o nome");
      if (!normalizedEmail) throw new Error("Informe o e-mail");
      if (pwd.length < 4) throw new Error("A senha deve ter pelo menos 4 caracteres");
      if (users.some((c) => String(c.email || "").trim().toLowerCase() === normalizedEmail)) {
        throw new Error("E-mail já cadastrado");
      }
      if (role !== ROLES.VISITOR && role !== ROLES.ORGANIZER) {
        throw new Error("Selecione visitante ou organizador");
      }
      const scopeState = String(organizerScopeState || "").trim().toUpperCase();
      const scopeCity = String(organizerScopeCity || "").trim();
      if (role === ROLES.ORGANIZER && !scopeState) {
        throw new Error("Organizador precisa do estado em que pode aprovar e criar eventos");
      }
      const now = getNowIso();
      const newUser = withAccessMetrics({
        id: `u-${Date.now()}`,
        name: trimmedName,
        email: normalizedEmail,
        password: pwd,
        role,
        bio: "",
        state: String(state || "").trim().toUpperCase(),
        city: String(city || "").trim(),
        instagram: "",
        organizerScopeState: role === ROLES.ORGANIZER ? scopeState : "",
        organizerScopeCity: role === ROLES.ORGANIZER ? scopeCity : "",
        createdAt: now,
        lastLoginAt: null,
        loginCount: 0,
      });
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    },
    [users]
  );

  const updateUserByAdmin = (userId, updates) => {
    const target = users.find((candidate) => candidate.id === userId);
    if (!target) throw new Error("Usuário não encontrado");

    const nextEmail = updates.email?.trim() || target.email;
    if (
      nextEmail !== target.email &&
      users.some((candidate) => candidate.email === nextEmail && candidate.id !== userId)
    ) {
      throw new Error("Já existe outro usuário com este e-mail");
    }

    if (target.email === ADMIN_EMAIL && nextEmail !== ADMIN_EMAIL) {
      throw new Error("O e-mail do administrador principal não pode ser alterado");
    }

    const nextRole = updates.role || target.role;
    if (target.email === ADMIN_EMAIL && nextRole !== ROLES.ADMIN) {
      throw new Error("O administrador principal deve manter o perfil ADMIN");
    }
    if (target.email !== ADMIN_EMAIL && nextRole === ROLES.ADMIN) {
      throw new Error("Somente o administrador principal pode ter perfil ADMIN");
    }

    const normalizedUpdates = {
      name: updates.name?.trim() || target.name,
      email: nextEmail,
      role: nextRole,
      state: updates.state !== undefined ? String(updates.state || "").trim().toUpperCase() : target.state,
      city: updates.city !== undefined ? String(updates.city || "").trim() : target.city,
    };

    if (nextRole === ROLES.ORGANIZER) {
      if (updates.organizerScopeState !== undefined) {
        normalizedUpdates.organizerScopeState = String(updates.organizerScopeState || "")
          .trim()
          .toUpperCase();
      } else {
        normalizedUpdates.organizerScopeState = target.organizerScopeState || "";
      }
      if (updates.organizerScopeCity !== undefined) {
        normalizedUpdates.organizerScopeCity = String(updates.organizerScopeCity || "").trim();
      } else {
        normalizedUpdates.organizerScopeCity = target.organizerScopeCity || "";
      }
      if (!normalizedUpdates.organizerScopeState) {
        throw new Error("Organizador precisa do estado de atuação");
      }
    } else {
      normalizedUpdates.organizerScopeState = "";
      normalizedUpdates.organizerScopeCity = "";
    }

    if (typeof updates.password === "string" && updates.password.trim()) {
      normalizedUpdates.password = updates.password.trim();
    }

    setUsers((prev) =>
      prev.map((candidate) =>
        candidate.id === userId ? withAccessMetrics({ ...candidate, ...normalizedUpdates }) : candidate
      )
    );

    if (user?.id === userId) {
      setUser((prev) => withAccessMetrics({ ...prev, ...normalizedUpdates }));
    }
  };

  const deleteUserByAdmin = (userId) => {
    const target = users.find((candidate) => candidate.id === userId);
    if (!target) throw new Error("Usuário não encontrado");
    if (target.email === ADMIN_EMAIL) {
      throw new Error("O administrador principal não pode ser apagado");
    }
    if (user?.id === userId) {
      throw new Error("Você não pode apagar a própria conta logada");
    }

    setUsers((prev) => prev.filter((candidate) => candidate.id !== userId));
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      users,
      login,
      emailExists,
      validateLoginCredentials,
      updateProfile,
      updateUserByAdmin,
      deleteUserByAdmin,
      createUserByAdmin,
      logout,
      register,
      isAdmin: user?.role === ROLES.ADMIN,
      isOrganizer: user?.role === ROLES.ORGANIZER,
      isVisitor: user?.role === ROLES.VISITOR,
    }),
    [user, users, createUserByAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider");
  }
  return context;
}
