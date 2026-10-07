import React from "react";
import { cn } from "@/lib/utils";

/**
 * Authentic Ethiopian Mesob icon — traditional woven dining basket.
 */
export function MesobIcon({ className = "h-5 w-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Mesob conical lid with pinnacle knob */}
      <circle cx="12" cy="3" r="1.25" fill="currentColor" stroke="none" />
      <path d="M12 4.25 L7 11 L17 11 Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M7 11 L17 11" />
      {/* Decorative woven bands across lid */}
      <path d="M9.5 8 L14.5 8" strokeDasharray="1.5 1.5" />
      {/* Mesob basket base / bowl */}
      <path d="M6 11.5 C6 16.5 8 18 12 18 C16 18 18 16.5 18 11.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M9 14.5 L15 14.5" strokeDasharray="1.5 1.5" />
      {/* Pedestal stand */}
      <path d="M8.5 18 L7 21 L17 21 L15.5 18" fill="currentColor" fillOpacity="0.2" />
      <path d="M7 21 L17 21" strokeWidth="2" />
    </svg>
  );
}

/**
 * Authentic Ethiopian Jebena icon — traditional clay coffee pot for Buna ceremony.
 */
export function JebenaIcon({ className = "h-5 w-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Round clay body */}
      <circle cx="12" cy="14" r="5.5" fill="currentColor" fillOpacity="0.15" />
      {/* Tall neck */}
      <path d="M10.5 8.5 L10.5 4 L13.5 4 L13.5 8.5" />
      {/* Spout */}
      <path d="M14 10 L19 6.5" strokeWidth="2" />
      <path d="M18.5 6 L19.5 7" />
      {/* Handle */}
      <path d="M7.5 10.5 C5.5 12 5.5 16 8 17.5" />
      {/* Base ring (straw ring / mat) */}
      <ellipse cx="12" cy="19.75" rx="4" ry="1.25" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

/**
 * Ethiopian decorative Tibeb divider with central diamond cross motif.
 * @param {{ className?: string, label?: string }} props
 */
export function TibebDivider({ className = "", label = "" }) {
  return (
    <div className={cn("habesha-rule my-6", className)}>
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-gold-600">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-gold-500 fill-current" aria-hidden="true">
          <polygon points="8,1 11,5 15,8 11,11 8,15 5,11 1,8 5,5" />
          <circle cx="8" cy="8" r="1.5" fill="#FAF7F2" />
        </svg>
        {label && <span className="font-display tracking-widest">{label}</span>}
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-gold-500 fill-current" aria-hidden="true">
          <polygon points="8,1 11,5 15,8 11,11 8,15 5,11 1,8 5,5" />
          <circle cx="8" cy="8" r="1.5" fill="#FAF7F2" />
        </svg>
      </div>
    </div>
  );
}
