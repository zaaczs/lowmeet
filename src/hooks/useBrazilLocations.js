import { useEffect, useMemo, useState } from "react";
import { fetchBrazilStates, fetchCitiesByStateUf } from "../services/brazilLocationsService";

export function useBrazilLocations(selectedState) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const list = await fetchBrazilStates();
        if (isMounted) setStates(list);
      } catch {
        if (isMounted) setStates([]);
      } finally {
        if (isMounted) setLoadingStates(false);
      }
    };
    loadStates();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }
      setLoadingCities(true);
      try {
        const list = await fetchCitiesByStateUf(selectedState);
        if (isMounted) setCities(list);
      } catch {
        if (isMounted) setCities([]);
      } finally {
        if (isMounted) setLoadingCities(false);
      }
    };
    loadCities();
    return () => {
      isMounted = false;
    };
  }, [selectedState]);

  const stateOptions = useMemo(
    () => states.map((state) => ({ value: state.sigla, label: `${state.nome} (${state.sigla})` })),
    [states]
  );

  return {
    stateOptions,
    cityOptions: cities,
    loadingStates,
    loadingCities,
  };
}
