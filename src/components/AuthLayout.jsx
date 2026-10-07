import React from "react";
import { MesobIcon } from "@/components/HabeshaDecorations";

/** @param {any} props */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 tibeb-strip" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-forest-900/5 border border-forest-900/10">
            <MesobIcon className="w-4 h-4 text-forest-800" />
            <span className="font-display text-xs font-semibold tracking-wider text-forest-800 uppercase">
              መሶብ · Mesob Restaurant
            </span>
          </div>
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-forest-800 to-forest-900 text-cream-100 shadow-md mb-3 ring-2 ring-gold-400/40">
              <Icon className="w-6 h-6 text-cream-100" aria-hidden="true" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-md border border-border p-8 relative overflow-hidden">
          <div className="tibeb-border-top" />
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
