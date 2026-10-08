import { notifyError } from "@/lib/notify";

const API_BASE_URL = (/** @type {any} */ (import.meta).env?.VITE_API_URL || "http://localhost:4000/api/v1").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData) && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      try {
        errorData = { message: await response.text() };
      } catch {
        errorData = { message: response.statusText };
      }
    }

    const message = errorData?.error || errorData?.message || `Request failed with status ${response.status}`;

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("rms:auth:unauthorized", { detail: { path, status: 401 } }));
      }
    } else if (response.status === 403) {
      notifyError("Permission Denied", message || "You do not have permission to perform this action.");
    }

    throw new ApiError(message, response.status, errorData);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export const api = {
  get: (path, params) => {
    let url = path;
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) search.append(k, String(v));
      });
      url += (url.includes("?") ? "&" : "?") + search.toString();
    }
    return request(url, { method: "GET" });
  },
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  raw: request,
};

// Domain endpoints
export const authApi = {
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout", {}),
  me: () => api.get("/auth/me"),
  unlock: (userId) => api.post(`/auth/unlock/${userId}`, {}),
};

export const ordersApi = {
  list: (params) => api.get("/orders", params),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post("/orders", data),
  addTicket: (orderId, data) => api.post(`/orders/${orderId}/tickets`, data),
  cancelItem: (orderId, itemId, reason) => api.post(`/orders/${orderId}/items/${itemId}/cancel`, { reason }),
  voidOrder: (orderId, reason) => api.post(`/orders/${orderId}/void`, { reason }),
};

export const ticketsApi = {
  list: (params) => api.get("/tickets", params),
  updateStatus: (ticketId, status) => api.patch(`/tickets/${ticketId}/status`, { status }),
  serveItem: (ticketId, itemId) => api.patch(`/tickets/${ticketId}/items/${itemId}/serve`, {}),
};

export const billingApi = {
  createInvoice: (orderId) => api.post(`/orders/${orderId}/invoice`, {}),
  recordPayment: (orderId, paymentData) => api.post(`/orders/${orderId}/payments`, paymentData),
  createCreditNote: (invoiceId, data) => api.post(`/invoices/${invoiceId}/credit-note`, data),
};

export const tablesApi = {
  list: () => api.get("/tables"),
  get: (id) => api.get(`/tables/${id}`),
  updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }),
  transfer: (fromTableId, toTableId) => api.post(`/tables/${fromTableId}/transfer`, { toTableId }),
  merge: (primaryTableId, secondaryTableId) => api.post(`/tables/${primaryTableId}/merge`, { secondaryTableId }),
};

export const inventoryApi = {
  list: (params) => api.get("/inventory", params),
  getMovements: (params) => api.get("/inventory/movements", params),
  recordCount: (counts) => api.post("/inventory/counts", { counts }),
};

export const purchasingApi = {
  list: (params) => api.get("/purchases", params),
  approve: (id) => api.patch(`/purchases/${id}/approve`, {}),
  receive: (id, receivedItems) => api.post(`/purchases/${id}/receive`, { receivedItems }),
};

export const reservationsApi = {
  list: (params) => api.get("/reservations", params),
  create: (data) => api.post("/reservations", data),
  updateStatus: (id, status, notes) => api.patch(`/reservations/${id}/status`, { status, notes }),
};

export const cleaningApi = {
  listTasks: (params) => api.get("/cleaning/tasks", params),
  startTask: (taskId) => api.patch(`/cleaning/tasks/${taskId}/start`, {}),
  completeTask: (taskId, notes) => api.patch(`/cleaning/tasks/${taskId}/complete`, { notes }),
  markTableAvailable: (tableId, force = false, overrideReason = "") =>
    api.post(`/cleaning/tables/${tableId}/mark-available`, { force, overrideReason }),
};

export const reportsApi = {
  salesSummary: (params) => api.get("/reports/sales-summary", params),
  salesByItem: (params) => api.get("/reports/sales-by-item", params),
  salesByWaiter: (params) => api.get("/reports/sales-by-waiter", params),
  cancellations: (params) => api.get("/reports/cancellations", params),
  dayClose: (overrideReason) => api.post("/reports/day-closure/close", { overrideReason }),
  dayReopen: (reason) => api.post("/reports/day-closure/reopen", { reason }),
  getExportUrl: (type, params = {}) => {
    const search = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/reports/export/${type}${search ? `?${search}` : ""}`;
  },
};
