import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  mockBanners,
  mockEvents,
  mockPendingApprovalEvents,
  mockStressTestEvents,
  syncShowcaseBannerLocalImages,
  getPartnerShowcaseBannerForPosition,
} from "../services/mockData";
import { PARTNER_BANNER_SLOT_POSITIONS, slugCityKeyForBannerSlot } from "../constants/partnerBannerSlots";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { readStoreJson, writeStoreJson } from "../lib/supabaseKvStore";
import { organizerCanCreateInLocation, organizerCanModerateEvent } from "../lib/organizerScope";
import { ROLES, useAuth } from "./AuthContext";

const AppDataContext = createContext(null);
const STORAGE_EVENTS = "lowmeet_events";
const STORAGE_BANNERS = "lowmeet_banners";
const STORAGE_FAVORITES = "lowmeet_favorites_by_user";
const STORAGE_NOTIFICATIONS = "lowmeet_notifications_by_user";
const STORAGE_BANNER_CLICKS = "lowmeet_banner_clicks";
const SUPABASE_EVENTS_KEY = "events";
const SUPABASE_BANNERS_KEY = "banners";
const SUPABASE_FAVORITES_KEY = "favoritesByUser";
const SUPABASE_NOTIFICATIONS_KEY = "notificationsByUser";
const SUPABASE_BANNER_CLICKS_KEY = "bannerClicksById";
const BANNER_TARGETING_LEVELS = {
  CITY: "CITY",
};

function normalizeDate(dateString) {
  return dateString?.split("T")[0] ?? "";
}

function normalizeBannerTargeting(rawBanner) {
  const normalizedLevel = BANNER_TARGETING_LEVELS.CITY;
  const normalizedState = String(rawBanner?.state || "").trim().toUpperCase();
  const normalizedCity = String(rawBanner?.city || "").trim();
  return {
    ...rawBanner,
    targetingLevel: normalizedLevel,
    state: normalizedState,
    city: normalizedCity,
    slotReleased: rawBanner?.slotReleased === true,
  };
}

function buildNotification({ title, message, type = "info", eventId = null }) {
  return {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    type,
    eventId,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
}

function appendMissingPendingApprovalEvents(sourceEvents) {
  const existingIds = new Set(sourceEvents.map((event) => event.id));
  const missing = mockPendingApprovalEvents.filter((event) => !existingIds.has(event.id));
  if (missing.length === 0) return sourceEvents;
  return [...missing, ...sourceEvents];
}

function syncStressTestEvents(sourceEvents) {
  const stressEventsById = new Map(mockStressTestEvents.map((event) => [event.id, event]));
  return sourceEvents.map((event) => stressEventsById.get(event.id) ?? event);
}

function sanitizeBanners(sourceBanners) {
  return sourceBanners
    .filter((banner) => banner.position !== "favorites-main")
    .map((banner) => normalizeBannerTargeting(banner));
}

function appendMissingDefaultBanners(sourceBanners) {
  const normalizedIncoming = sourceBanners.map((banner) => normalizeBannerTargeting(banner));
  const existingIds = new Set(normalizedIncoming.map((banner) => banner.id));
  const missing = sanitizeBanners(mockBanners).filter((banner) => !existingIds.has(banner.id));
  if (missing.length === 0) {
    return syncShowcaseBannerLocalImages(normalizedIncoming);
  }
  return syncShowcaseBannerLocalImages([...normalizedIncoming, ...missing]);
}

export function AppDataProvider({ children }) {
  const validateBannerCoverage = (nextBanner) => {
    if (!nextBanner?.active) return;
    if (!nextBanner.position) return;
    if (!nextBanner.state || !nextBanner.city) {
      throw new Error("Selecione estado e cidade para cadastrar o banner.");
    }
  };

  const { user, users } = useAuth();
  const [events, setEvents] = useState(() => {
    const raw = localStorage.getItem(STORAGE_EVENTS);
    if (!raw) return mockEvents;
    try {
      return appendMissingPendingApprovalEvents(syncStressTestEvents(JSON.parse(raw)));
    } catch {
      return mockEvents;
    }
  });
  const [banners, setBanners] = useState(() => {
    const raw = localStorage.getItem(STORAGE_BANNERS);
    if (!raw) return appendMissingDefaultBanners(sanitizeBanners(mockBanners));
    try {
      return appendMissingDefaultBanners(sanitizeBanners(JSON.parse(raw)));
    } catch {
      return appendMissingDefaultBanners(sanitizeBanners(mockBanners));
    }
  });
  const [favoritesByUser, setFavoritesByUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_FAVORITES);
    return raw ? JSON.parse(raw) : {};
  });
  const [notificationsByUser, setNotificationsByUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_NOTIFICATIONS);
    return raw ? JSON.parse(raw) : {};
  });
  const [bannerClicksById, setBannerClicksById] = useState(() => {
    const raw = localStorage.getItem(STORAGE_BANNER_CLICKS);
    return raw ? JSON.parse(raw) : {};
  });

  const eventsPersistReadyRef = useRef(!isSupabaseConfigured);
  const eventsHydratingRef = useRef(false);
  const initialEventsRef = useRef(events);
  const bannersPersistReadyRef = useRef(!isSupabaseConfigured);
  const bannersHydratingRef = useRef(false);
  const initialBannersRef = useRef(banners);
  const favoritesPersistReadyRef = useRef(!isSupabaseConfigured);
  const favoritesHydratingRef = useRef(false);
  const initialFavoritesRef = useRef(favoritesByUser);
  const notificationsPersistReadyRef = useRef(!isSupabaseConfigured);
  const notificationsHydratingRef = useRef(false);
  const initialNotificationsRef = useRef(notificationsByUser);
  const clicksPersistReadyRef = useRef(!isSupabaseConfigured);
  const clicksHydratingRef = useRef(false);
  const initialClicksRef = useRef(bannerClicksById);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    eventsHydratingRef.current = true;

    (async () => {
      const { data, error } = await readStoreJson(SUPABASE_EVENTS_KEY);
      if (error) {
        console.error("LowMeet: não foi possível carregar eventos do Supabase", error);
        eventsPersistReadyRef.current = true;
        eventsHydratingRef.current = false;
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const nextEvents = appendMissingPendingApprovalEvents(syncStressTestEvents(data));
        if (!cancelled) {
          setEvents(nextEvents);
          localStorage.setItem(STORAGE_EVENTS, JSON.stringify(nextEvents));
        }
      } else {
        await writeStoreJson(SUPABASE_EVENTS_KEY, initialEventsRef.current);
      }

      if (!cancelled) {
        eventsPersistReadyRef.current = true;
        eventsHydratingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    bannersHydratingRef.current = true;

    (async () => {
      const { data, error } = await readStoreJson(SUPABASE_BANNERS_KEY);
      if (error) {
        console.error("LowMeet: não foi possível carregar banners do Supabase", error);
        bannersPersistReadyRef.current = true;
        bannersHydratingRef.current = false;
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const nextBanners = appendMissingDefaultBanners(sanitizeBanners(data));
        if (!cancelled) {
          setBanners(nextBanners);
          localStorage.setItem(STORAGE_BANNERS, JSON.stringify(nextBanners));
        }
      } else {
        await writeStoreJson(SUPABASE_BANNERS_KEY, initialBannersRef.current);
      }

      if (!cancelled) {
        bannersPersistReadyRef.current = true;
        bannersHydratingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    favoritesHydratingRef.current = true;

    (async () => {
      const { data, error } = await readStoreJson(SUPABASE_FAVORITES_KEY);
      if (error) {
        console.error("LowMeet: não foi possível carregar favoritos do Supabase", error);
        favoritesPersistReadyRef.current = true;
        favoritesHydratingRef.current = false;
        return;
      }

      if (data && typeof data === "object" && !Array.isArray(data)) {
        if (!cancelled) {
          setFavoritesByUser(data);
          localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(data));
        }
      } else {
        await writeStoreJson(SUPABASE_FAVORITES_KEY, initialFavoritesRef.current);
      }

      if (!cancelled) {
        favoritesPersistReadyRef.current = true;
        favoritesHydratingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    notificationsHydratingRef.current = true;

    (async () => {
      const { data, error } = await readStoreJson(SUPABASE_NOTIFICATIONS_KEY);
      if (error) {
        console.error("LowMeet: não foi possível carregar notificações do Supabase", error);
        notificationsPersistReadyRef.current = true;
        notificationsHydratingRef.current = false;
        return;
      }

      if (data && typeof data === "object" && !Array.isArray(data)) {
        if (!cancelled) {
          setNotificationsByUser(data);
          localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(data));
        }
      } else {
        await writeStoreJson(SUPABASE_NOTIFICATIONS_KEY, initialNotificationsRef.current);
      }

      if (!cancelled) {
        notificationsPersistReadyRef.current = true;
        notificationsHydratingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    clicksHydratingRef.current = true;

    (async () => {
      const { data, error } = await readStoreJson(SUPABASE_BANNER_CLICKS_KEY);
      if (error) {
        console.error("LowMeet: não foi possível carregar cliques de banners do Supabase", error);
        clicksPersistReadyRef.current = true;
        clicksHydratingRef.current = false;
        return;
      }

      if (data && typeof data === "object" && !Array.isArray(data)) {
        if (!cancelled) {
          setBannerClicksById(data);
          localStorage.setItem(STORAGE_BANNER_CLICKS, JSON.stringify(data));
        }
      } else {
        await writeStoreJson(SUPABASE_BANNER_CLICKS_KEY, initialClicksRef.current);
      }

      if (!cancelled) {
        clicksPersistReadyRef.current = true;
        clicksHydratingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(favoritesByUser));
    if (!isSupabaseConfigured) return;
    if (!favoritesPersistReadyRef.current || favoritesHydratingRef.current) return;
    writeStoreJson(SUPABASE_FAVORITES_KEY, favoritesByUser).catch((error) => {
      console.error("LowMeet: não foi possível salvar favoritos no Supabase", error);
    });
  }, [favoritesByUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
    if (!isSupabaseConfigured) return;
    if (!eventsPersistReadyRef.current || eventsHydratingRef.current) return;
    writeStoreJson(SUPABASE_EVENTS_KEY, events).catch((error) => {
      console.error("LowMeet: não foi possível salvar eventos no Supabase", error);
    });
  }, [events]);

  useEffect(() => {
    localStorage.setItem(STORAGE_BANNERS, JSON.stringify(banners));
    if (!isSupabaseConfigured) return;
    if (!bannersPersistReadyRef.current || bannersHydratingRef.current) return;
    writeStoreJson(SUPABASE_BANNERS_KEY, banners).catch((error) => {
      console.error("LowMeet: não foi possível salvar banners no Supabase", error);
    });
  }, [banners]);

  useEffect(() => {
    localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(notificationsByUser));
    if (!isSupabaseConfigured) return;
    if (!notificationsPersistReadyRef.current || notificationsHydratingRef.current) return;
    writeStoreJson(SUPABASE_NOTIFICATIONS_KEY, notificationsByUser).catch((error) => {
      console.error("LowMeet: não foi possível salvar notificações no Supabase", error);
    });
  }, [notificationsByUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_BANNER_CLICKS, JSON.stringify(bannerClicksById));
    if (!isSupabaseConfigured) return;
    if (!clicksPersistReadyRef.current || clicksHydratingRef.current) return;
    writeStoreJson(SUPABASE_BANNER_CLICKS_KEY, bannerClicksById).catch((error) => {
      console.error("LowMeet: não foi possível salvar cliques de banners no Supabase", error);
    });
  }, [bannerClicksById]);

  const createEvent = (payload) => {
    if (!user) throw new Error("Usuário não autenticado");

    const locState = String(payload.state || "").trim().toUpperCase();
    const locCity = String(payload.city || "").trim();
    if (!organizerCanCreateInLocation(user, locState, locCity)) {
      throw new Error(
        "Você só pode criar eventos no estado e cidade (ou em todo o estado) definidos para o seu perfil de organizador."
      );
    }

    const normalizedTicketType = payload.ticketType === "paid" ? "paid" : "free";
    const normalizedTicketPrice =
      normalizedTicketType === "paid" ? Number(payload.ticketPrice || 0) : null;
    const normalizedLocation =
      payload.location ||
      `${payload.street || ""}, ${payload.number || ""}${
        payload.complement ? ` - ${payload.complement}` : ""
      }`;

    const newEvent = {
      id: `ev-${Date.now()}`,
      ...payload,
      ticketType: normalizedTicketType,
      ticketPrice: normalizedTicketPrice,
      location: normalizedLocation,
      organizerId: user.id,
      organizerName: user.name,
      status: user.role === ROLES.ADMIN ? "approved" : "pending",
      createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);

    setNotificationsByUser((prev) => {
      const next = { ...prev };

      const requesterNotification =
        user.role !== ROLES.ADMIN
          ? buildNotification({
              title: "Evento solicitado",
              message: `Seu evento "${newEvent.name}" foi enviado para aprovação do administrador.`,
              type: "success",
              eventId: newEvent.id,
            })
          : buildNotification({
              title: "Evento publicado",
              message: `Seu evento "${newEvent.name}" foi publicado com sucesso.`,
              type: "success",
              eventId: newEvent.id,
            });

      next[user.id] = [requesterNotification, ...(next[user.id] ?? [])];

      if (user.role !== ROLES.ADMIN) {
        const adminUsers = users.filter((candidate) => candidate.role === ROLES.ADMIN);
        adminUsers.forEach((adminUser) => {
          const adminNotification = buildNotification({
            title: "Novo evento para aprovação",
            message: `${user.name} solicitou aprovação para o evento "${newEvent.name}".`,
            type: "info",
            eventId: newEvent.id,
          });
          next[adminUser.id] = [adminNotification, ...(next[adminUser.id] ?? [])];
        });
      }

      return next;
    });

    return newEvent;
  };

  const updateEvent = (eventId, updates) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? { ...event, ...updates } : event))
    );
  };

  const deleteEvent = (eventId) => {
    if (!user) throw new Error("Usuário não autenticado");

    const targetEvent = events.find((event) => event.id === eventId);
    if (!targetEvent) return;

    if (user?.role === ROLES.ORGANIZER && !organizerCanModerateEvent(user, targetEvent)) {
      throw new Error("Este evento está fora da sua área de atuação como organizador.");
    }

    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    setFavoritesByUser((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([userId, favorites]) => [
          userId,
          (favorites ?? []).filter((favoriteId) => favoriteId !== eventId),
        ])
      )
    );
    setNotificationsByUser((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([userId, notifications]) => [
          userId,
          (notifications ?? []).filter((notification) => notification.eventId !== eventId),
        ])
      )
    );
  };

  const setEventStatus = (eventId, status) => {
    const targetEvent = events.find((event) => event.id === eventId);
    if (!targetEvent) return;

    if (user?.role === ROLES.ORGANIZER && !organizerCanModerateEvent(user, targetEvent)) {
      throw new Error("Este evento está fora da sua área de atuação como organizador.");
    }

    updateEvent(eventId, { status });

    if (!targetEvent.organizerId) return;
    if (status !== "approved" && status !== "rejected") return;

    const organizerNotification =
      status === "approved"
        ? buildNotification({
            title: "Evento aprovado",
            message: `Seu evento "${targetEvent.name}" foi aprovado pelo administrador.`,
            type: "success",
            eventId: targetEvent.id,
          })
        : buildNotification({
            title: "Evento reprovado",
            message: `Seu evento "${targetEvent.name}" foi reprovado pelo administrador.`,
            type: "warning",
            eventId: targetEvent.id,
          });

    setNotificationsByUser((prev) => ({
      ...prev,
      [targetEvent.organizerId]: [
        organizerNotification,
        ...(prev[targetEvent.organizerId] ?? []),
      ],
    }));
  };

  const updateBanner = (bannerId, updates) => {
    const currentBanner = banners.find((banner) => banner.id === bannerId);
    if (!currentBanner) return;
    const nextBanner = normalizeBannerTargeting({ ...currentBanner, ...updates });
    validateBannerCoverage(nextBanner);
    setBanners((prev) =>
      prev.map((banner) => (banner.id === bannerId ? nextBanner : banner))
    );
  };

  const toggleBannerStatus = (bannerId) => {
    const current = banners.find((banner) => banner.id === bannerId);
    if (!current) return;
    updateBanner(bannerId, { active: !current.active });
  };

  const ensurePartnerSlotsForCity = useCallback((state, city) => {
    const st = String(state || "").trim().toUpperCase();
    const ct = String(city || "").trim();
    if (!st || !ct) return;

    setBanners((prev) => {
      let changed = false;
      const next = [...prev];
      const citySlug = slugCityKeyForBannerSlot(ct);

      for (const position of PARTNER_BANNER_SLOT_POSITIONS) {
        const exists = next.some(
          (banner) =>
            String(banner.state || "").trim().toUpperCase() === st &&
            String(banner.city || "").trim() === ct &&
            banner.position === position
        );
        if (exists) continue;

        const template = getPartnerShowcaseBannerForPosition(position);
        const id = `bn-slot-${st}-${citySlug}-${position}`;
        next.push(
          normalizeBannerTargeting({
            id,
            brandName: template?.brandName || "Espaço reservado",
            type: String(template?.type || "patrocínio"),
            image: template?.image || "",
            link: String(template?.link || ""),
            position,
            state: st,
            city: ct,
            focusY: Number(template?.focusY ?? 50),
            story: String(template?.story || ""),
            active: false,
            slotReleased: false,
          })
        );
        changed = true;
      }

      return changed ? next : prev;
    });
  }, []);

  const registerBannerClick = (bannerId) => {
    setBannerClicksById((prev) => {
      const current = prev[bannerId] ?? { total: 0, lastClickedAt: null, clicksByUser: {} };
      const currentUserClicks = user ? Number(current.clicksByUser?.[user.id] || 0) : 0;
      return {
        ...prev,
        [bannerId]: {
          total: Number(current.total || 0) + 1,
          lastClickedAt: new Date().toISOString(),
          clicksByUser: user
            ? {
                ...(current.clicksByUser ?? {}),
                [user.id]: currentUserClicks + 1,
              }
            : current.clicksByUser ?? {},
        },
      };
    });
  };

  const getFavoriteIds = () => {
    if (!user) return [];
    return favoritesByUser[user.id] ?? [];
  };

  const toggleFavorite = (eventId) => {
    if (!user) return;
    setFavoritesByUser((prev) => {
      const current = prev[user.id] ?? [];
      const next = current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];
      return { ...prev, [user.id]: next };
    });
  };

  const markNotificationAsRead = (notificationId) => {
    if (!user) return;
    setNotificationsByUser((prev) => {
      const current = prev[user.id] ?? [];
      return {
        ...prev,
        [user.id]: current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
            : notification
        ),
      };
    });
  };

  const markAllNotificationsAsRead = () => {
    if (!user) return;
    setNotificationsByUser((prev) => {
      const current = prev[user.id] ?? [];
      return {
        ...prev,
        [user.id]: current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      };
    });
  };

  const seedTestEvents = () => {
    setEvents((prev) => {
      const testEventsById = new Map(mockStressTestEvents.map((event) => [event.id, event]));
      const mergedEvents = prev.map((event) => testEventsById.get(event.id) ?? event);
      const existingIds = new Set(mergedEvents.map((event) => event.id));
      const missingTestEvents = mockStressTestEvents.filter((event) => !existingIds.has(event.id));
      if (!missingTestEvents.length) return mergedEvents;
      return [...missingTestEvents, ...mergedEvents];
    });
  };

  const metrics = useMemo(() => {
    const totalEvents = events.length;
    const recentEvents = events
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    const eventsByCity = events.reduce((acc, event) => {
      acc[event.city] = (acc[event.city] ?? 0) + 1;
      return acc;
    }, {});

    return { totalEvents, recentEvents, eventsByCity };
  }, [events]);

  const value = useMemo(
    () => ({
      events,
      banners,
      metrics,
      createEvent,
      updateEvent,
      deleteEvent,
      setEventStatus,
      ensurePartnerSlotsForCity,
      updateBanner,
      toggleBannerStatus,
      registerBannerClick,
      bannerClickStats: bannerClicksById,
      toggleFavorite,
      notifications: user ? notificationsByUser[user.id] ?? [] : [],
      unreadNotificationsCount: user
        ? (notificationsByUser[user.id] ?? []).filter((notification) => !notification.readAt)
            .length
        : 0,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      seedTestEvents,
      favoriteIds: getFavoriteIds(),
      favoriteEvents: events.filter((event) => getFavoriteIds().includes(event.id)),
      approvedEvents: events.filter((event) => event.status === "approved"),
      pendingEvents: events.filter((event) => event.status === "pending"),
      filterEvents: ({
        query = "",
        state = "",
        city = "",
        type = "",
        year = "",
        month = "",
        day = "",
        date = "",
      }) =>
        events.filter((event) => {
          const [eventYear = "", eventMonth = "", eventDay = ""] = normalizeDate(
            event.datetime
          ).split("-");
          const byQuery =
            !query ||
            [event.name, event.type, event.city, event.state].some((field) =>
              field.toLowerCase().includes(query.toLowerCase())
            );
          const byState = !state || event.state === state;
          const byCity = !city || event.city === city;
          const byType = !type || event.type === type;
          const byYear = !year || eventYear === year;
          const byMonth = !month || eventMonth === month;
          const byDay = !day || eventDay === day;
          const byDate = !date || normalizeDate(event.datetime) === date;
          return byQuery && byState && byCity && byType && byYear && byMonth && byDay && byDate;
        }),
    }),
    [
      events,
      banners,
      metrics,
      user,
      favoritesByUser,
      notificationsByUser,
      bannerClicksById,
      ensurePartnerSlotsForCity,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData precisa ser usado dentro de AppDataProvider");
  }
  return context;
}
