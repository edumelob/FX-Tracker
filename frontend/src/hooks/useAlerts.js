/**
 * Custom hook: useAlerts
 * Manages alert CRUD operations with local state synchronization.
 */

import { useCallback, useEffect, useState } from "react";
import { cancelAlert, createAlert, fetchAlerts } from "../utils/api";

/**
 * @returns {{
 *   alerts: Array,
 *   isLoading: boolean,
 *   error: string|null,
 *   createNewAlert: function,
 *   removeAlert: function,
 *   refresh: function,
 * }}
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err.message || "Failed to load alerts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const createNewAlert = useCallback(
    async (payload) => {
      const newAlert = await createAlert(payload);
      setAlerts((prev) => [newAlert, ...prev]);
      return newAlert;
    },
    []
  );

  const removeAlert = useCallback(async (alertId) => {
    await cancelAlert(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "cancelled" } : a))
    );
  }, []);

  return {
    alerts,
    isLoading,
    error,
    createNewAlert,
    removeAlert,
    refresh: loadAlerts,
  };
}
