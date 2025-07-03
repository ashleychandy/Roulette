import { useState, useCallback } from "react";

/**
 * Hook for managing toast notifications
 * @returns {Object} Toast management functions and state
 */
export const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast notification
  const addToast = useCallback((message, type = "info", duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Add the toast
    setToasts((prev) => {
      // Limit to 3 toasts at a time
      const newToasts = [...prev, { id, message, type, duration }];
      if (newToasts.length > 3) {
        return newToasts.slice(-3);
      }
      return newToasts;
    });

    // Auto-remove after duration (if not 0)
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove a toast by ID
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };
};
