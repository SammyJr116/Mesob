import React, { useId } from "react";
import { cn } from "@/lib/utils";

/* Status palette drawn from the warm material set rather than the stock
   cool greys, so badges sit in the same world as the cream surfaces.
   Meaning is carried by hue family: sage = good, gold = in progress,
   clay/berbere = problem, cream = dormant. */
const GOOD = "bg-sage-100 text-sage-700";
const WORK = "bg-gold-100 text-gold-600";
const LIVE = "bg-terracotta-100 text-terracotta-600";
const WARN = "bg-berbere-100 text-berbere-600";
const IDLE = "bg-sand-200 text-walnut-600";
const DARK = "bg-walnut-800 text-cream-300";

const STATUS_STYLES = {
  Available: GOOD,
  Occupied: LIVE,
  Reserved: WORK,
  Cleaning: "bg-sage-100 text-sage-700",
  "Out of Service": DARK,
  Active: WORK,
  Draft: IDLE,
  Served: LIVE,
  Completed: GOOD,
  Cancelled: IDLE,
  Submitted: WORK,
  Preparing: WORK,
  Ready: GOOD,
  Pending: IDLE,
  Confirmed: GOOD,
  Arrived: LIVE,
  "No Show": WARN,
  "In Progress": WORK,
  Overdue: WARN,
  Reported: WARN,
  Assigned: WORK,
  Resolved: GOOD,
  Found: IDLE,
  Claimed: GOOD,
  OK: GOOD,
  Low: WORK,
  Requested: WORK,
  Approved: GOOD,
  Received: GOOD,
  "Partially Received": WORK,
  Rejected: WARN,
  Closed: DARK,
  "Emergency - Received": WARN,
  "Pending confirmation": WORK,
  "Under Maintenance": WORK,
  Retired: DARK,
  Inactive: DARK,
};

/**
 * @param {{ status: string, className?: string }} props
 */
export function StatusBadge({ status, className }) {
  const style = STATUS_STYLES[status] || IDLE;
  return <span className={cn("status-dot", style, className)}>{status}</span>;
}

/**
 * @param {{ title: string, subtitle?: string, actions?: import("react").ReactNode }} props
 */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
      <h1 className="font-display text-page font-semibold leading-tight tracking-tight text-foreground sm:text-[2rem]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-2xl text-lede leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** @param {any} props */
export function StatCard({ label, value, sub, icon: Icon, tone = "default", onClick }) {
  /* Value colour carries the signal; the top rule and icon follow the tone so
     a row of tiles reads as one set instead of unrelated cards. */
  const tones = {
    default: "text-foreground",
    gold: "text-gold-600",
    sage: "text-sage-600",
    berbere: "text-berbere-500",
    terracotta: "text-terracotta-500",
    wood: "text-wood-500",
  };
  const ruleTones = {
    default: "before:bg-gold/70",
    gold: "before:bg-gold",
    sage: "before:bg-sage-400",
    berbere: "before:bg-berbere-400",
    terracotta: "before:bg-terracotta-400",
    wood: "before:bg-wood-400",
  };
  const chipTones = {
    default: "bg-sand-200 text-walnut-600",
    gold: "bg-gold-100 text-gold-600",
    sage: "bg-sage-100 text-sage-600",
    berbere: "bg-berbere-100 text-berbere-600",
    terracotta: "bg-terracotta-100 text-terracotta-600",
    wood: "bg-sand-200 text-walnut-600",
  };
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { type: "button", onClick } : {})}
      aria-label={onClick ? `${label}: ${value}` : undefined}
      className={cn(
        "card-soft group relative flex flex-col gap-2 overflow-hidden p-5 text-left transition-all duration-200",
        "before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-['']",
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-border hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          : "hover:shadow-warm",
        ruleTones[tone]
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", chipTones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <span className={cn("tabular font-display text-page font-semibold leading-none", tones[tone])}>
        {value}
      </span>
      {sub && <span className="text-xs leading-relaxed text-muted-foreground">{sub}</span>}
    </Wrapper>
  );
}

/**
 * @param {{ title: string, description?: string, icon?: import("lucide-react").LucideIcon, action?: import("react").ReactNode }} props
 */
export function EmptyState({ title, description, icon: Icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gold/30 bg-sand-100/50 px-6 py-16 text-center">
      {Icon && <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-600"><Icon className="h-6 w-6" /></div>}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * @param {{ value: string, onChange: (v: string) => void, placeholder?: string, label?: string }} props
 */
export function SearchInput({ value, onChange, placeholder = "Search…", label }) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label || placeholder}</label>
      <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-soft pl-9" />
    </div>
  );
}

/**
 * @param {{ title?: string, action?: import("react").ReactNode, children: import("react").ReactNode, className?: string }} props
 */
export function SectionCard({ title, action, children, className }) {
  return (
    <div className={cn("card-soft p-6", className)}>
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && (
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}