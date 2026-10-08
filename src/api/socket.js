import { io } from "socket.io-client";
import { playAlertChime, notifySuccess, notifyError } from "@/lib/notify";

const WS_BASE_URL = (/** @type {any} */ (import.meta).env?.VITE_WS_URL || "http://localhost:4000").replace(/\/+$/, "");

let socket = null;
const eventSubscribers = new Map();

export function getSocket() {
  return socket;
}

export function initSocket(authToken = null) {
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const token = authToken || (typeof localStorage !== "undefined" ? localStorage.getItem("rms_token") : null);

  socket = io(WS_BASE_URL, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    auth: token ? { token } : undefined,
  });

  socket.on("connect", () => {
    // Successfully connected
  });

  socket.on("connect_error", (err) => {
    // If auth error or backend unavailable, log quietly without breaking UI
    console.warn("[WebSocket] Connection error:", err.message);
  });

  // Global event handling with chimes and dispatch
  const handleServerEvent = (eventName, data) => {
    if (data?.playSound) {
      playAlertChime();
    }

    // Specific toasts for critical alerts
    if (eventName === "ticket:ready") {
      notifySuccess("Kitchen Alert", `Ticket #${data?.ticket?.ticketNumber || ""} is READY!`);
    } else if (eventName === "ticket:delayed") {
      notifyError("Kitchen Alert", `Ticket #${data?.ticket?.ticketNumber || ""} is DELAYED (>20m)!`);
    } else if (eventName === "inventory:low_stock") {
      notifyError("Low Stock Alert", `${data?.item?.name || "Item"} has fallen below reorder threshold!`);
    } else if (eventName === "reservation:no_show") {
      notifyError("Reservation Alert", `Reservation ${data?.reservation?.code || ""} marked No Show.`);
    }

    // Dispatch to registered local subscribers
    const callbacks = eventSubscribers.get(eventName) || [];
    callbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[WebSocket] Error in subscriber for ${eventName}:`, err);
      }
    });

    // Also dispatch to generic subscriber if any
    const allCallbacks = eventSubscribers.get("*") || [];
    allCallbacks.forEach((cb) => {
      try {
        cb(eventName, data);
      } catch (err) {
        console.error(`[WebSocket] Error in generic subscriber:`, err);
      }
    });
  };

  const registeredEvents = [
    "ticket:submitted",
    "ticket:ready",
    "ticket:status_changed",
    "ticket:delayed",
    "table:cleaning",
    "table:updated",
    "order:updated",
    "inventory:low_stock",
    "menu:item_unavailable",
    "menu:item_available",
    "reservation:no_show",
  ];

  registeredEvents.forEach((evt) => {
    socket.on(evt, (data) => handleServerEvent(evt, data));
  });

  return socket;
}

export function subscribeToEvent(eventName, callback) {
  if (!eventSubscribers.has(eventName)) {
    eventSubscribers.set(eventName, []);
  }
  eventSubscribers.get(eventName).push(callback);

  return () => {
    const list = eventSubscribers.get(eventName) || [];
    const index = list.indexOf(callback);
    if (index !== -1) {
      list.splice(index, 1);
    }
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
