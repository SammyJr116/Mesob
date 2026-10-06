import { restaurant as defaultConfig } from "./mockData";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function businessDate(d = new Date()) {
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

export function clockTime(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function stamp(d = new Date()) {
  return `${businessDate(d)} ${clockTime(d)}`;
}

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Seed data carries readable stamps like "Sep 30 06:21"; anything written at
   runtime uses `stamp()`. Comparing the two needs one shared parser. */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const iso = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const withTime = iso.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{1,2})(?::(\d{2}))?/);
  if (withTime) {
    const month = MONTHS.indexOf(withTime[1]);
    if (month < 0) return null;
    const year = new Date().getFullYear();
    return new Date(year, month, Number(withTime[2]), Number(withTime[3] || 0), Number(withTime[4] || 0));
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(a, b) {
  const from = toDate(a);
  const to = toDate(b);
  if (!from || !to) return null;
  return Math.floor((startOfDay(to) - startOfDay(from)) / 86400000);
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/* Business days run from opening until `closingTime` the next calendar morning,
   so a ticket submitted at 01:00 belongs to the previous day. */
export function businessDayOf(hhmm, now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/^\d{2}:\d{2}$/.test(String(hhmm || "")) && String(hhmm) < "06:00") {
    day.setDate(day.getDate() - 1);
  }
  return `${MONTHS[day.getMonth()]} ${String(day.getDate()).padStart(2, "0")}`;
}

/* Same cutoff rule, applied to any stored stamp rather than a clock string. */
export function businessDayOfStamp(value) {
  const d = toDate(value);
  if (!d) return null;
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return businessDayOf(hhmm, d);
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export function businessDateAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return businessDate(d);
}

export function minutesSince(hhmm, now = new Date()) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const h = parseInt(String(hhmm).slice(0, 2), 10);
  const m = parseInt(String(hhmm).slice(3, 5), 10);
  const then = new Date(now.getTime());
  then.setHours(h, m, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / 60000);
}

export function nextId(rows, prefix, digits = 4) {
  const max = (rows || []).reduce((acc, r) => {
    const n = Number(String(r.id ?? "").replace(/^\D+/, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(digits, "0")}`;
}

/* Order numbering follows whatever prefix/digit count Settings currently holds;
   the seed config is only a fallback for callers outside the store. */
export function nextNumber(orders, config = defaultConfig) {
  const prefix = config.orderPrefix || "ORD-";
  const digits = config.orderDigits || 4;
  return nextId(orders, prefix, digits).replace(prefix, "");
}