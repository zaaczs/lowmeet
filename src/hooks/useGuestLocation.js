import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const STORAGE_GUEST_STATE = "lowmeet_guest_state";
const STORAGE_GUEST_CITY = "lowmeet_guest_city";

function readLocalStorageValue(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeGuestLocationToStorage(state, city) {
  localStorage.setItem(STORAGE_GUEST_STATE, String(state || "").trim().toUpperCase());
  localStorage.setItem(STORAGE_GUEST_CITY, String(city || "").trim());
}

export function useGuestLocation() {
  const { user } = useAuth();
  const [guestState, setGuestState] = useState(() => readLocalStorageValue(STORAGE_GUEST_STATE));
  const [guestCity, setGuestCity] = useState(() => readLocalStorageValue(STORAGE_GUEST_CITY));

  const saveGuestLocation = ({ state, city }) => {
    const normalizedState = String(state || "").trim().toUpperCase();
    const normalizedCity = String(city || "").trim();
    writeGuestLocationToStorage(normalizedState, normalizedCity);
    setGuestState(normalizedState);
    setGuestCity(normalizedCity);
  };

  const effectiveState = useMemo(
    () => String(user?.state || guestState || "").trim().toUpperCase(),
    [guestState, user?.state]
  );
  const effectiveCity = useMemo(
    () => String(user?.city || guestCity || "").trim(),
    [guestCity, user?.city]
  );

  return {
    effectiveState,
    effectiveCity,
    guestState,
    guestCity,
    saveGuestLocation,
  };
}
