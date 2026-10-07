import React from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Tablet, Smartphone, ChevronRight } from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { useData } from "@/lib/DataContext";
import { ROLES } from "@/lib/roles";
import { MesobIcon, JebenaIcon, TibebDivider } from "@/components/HabeshaDecorations";
import { cn } from "@/lib/utils";

const DEVICE_ICON = { Desktop: Monitor, Tablet: Tablet, Phone: Smartphone };
const ROLE_HOME = {
  manager: "Dashboard", admin: "User management", kitchen: "Kitchen queue",
  waiter: "Tables & orders", inventory: "Inventory list", cleaner: "My tasks", security: "Visitor register",
};
const ROLE_GEEZ = {
  manager: "ቤት አስተዳዳሪ",
  admin: "ተቆጣጣሪ",
  kitchen: "ማዕድ ቤት",
  waiter: "አስተናጋጅ",
  inventory: "ክምችት",
  cleaner: "ጽዳት",
  security: "ደህንነት",
};
const ROLE_BLURB = {
  manager: "Owns all dining operations, reports, settings, and staff.",
  admin: "Manages user accounts, roles, and access credentials.",
  kitchen: "Prepares traditional tickets, toggles availability, edits recipes.",
  waiter: "Takes guest orders, serves tables, records invoices.",
  inventory: "Handles traditional spices, suppliers, stock, and purchases.",
  cleaner: "Maintains dining floor, mesob resets, and kitchen cleanliness.",
  security: "Welcomes visitors, oversees register, and ensures security.",
};
const ROLE_ACCENT = {
  manager: "from-forest to-gold",
  admin: "from-walnut to-wood",
  kitchen: "from-berbere to-terracotta",
  waiter: "from-gold to-forest",
  inventory: "from-forest to-terracotta",
  cleaner: "from-gold to-terracotta",
  security: "from-wood to-walnut",
};

const MURAL = "/images/role-mural.png";
const ARCHWAY = "/images/role-archway.png";

export default function RoleSelect() {
  const { setRole } = useRole();
  const { db } = useData();
  const { restaurant } = db;
  const navigate = useNavigate();

  const choose = (r) => {
    setRole(r.id);
    navigate(r.home);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ambient warm light cones */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bloom-gold blur-3xl opacity-80" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bloom-sage blur-2xl opacity-60" />
        <div className="absolute -bottom-16 right-0 h-96 w-96 rounded-full bg-forest/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-12 sm:py-20">
        {/* Hero — archway-framed mural with authentic Habesha hospitality branding */}
        <div className="mb-14 flex flex-col items-center text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-300/70 bg-card/85 px-4 py-1.5 text-xs font-semibold text-walnut-800 shadow-warm backdrop-blur">
            <span className="font-display font-bold text-gold-600">መሶብ · MESOB</span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">Traditional Habesha Dining Experience</span>
          </div>

          <div className="relative mb-6">
            <div
              className="arch-frame relative flex h-44 w-44 items-end justify-center sm:h-52 sm:w-52 ring-2 ring-gold/40 shadow-glow"
              style={{ backgroundImage: `linear-gradient(to bottom, rgba(79,54,36,0.05), rgba(245,240,232,0.92)), url(${ARCHWAY})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 arch-top bg-gradient-to-b from-transparent via-transparent to-card" />
              <img src={MURAL} alt="Mesob traditional art" className="relative h-36 w-36 rounded-t-[9999px] rounded-b-lg object-cover shadow-warm sm:h-44 sm:w-44" />
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            <span className="text-gold-gradient">{restaurant.name}</span>
          </h1>
          <p className="mt-2.5 font-display text-lg italic text-walnut-800 sm:text-xl">
            "Authentic Habesha Flavors, Shared With Heart"
          </p>
          <p className="mt-1 text-xs uppercase tracking-brand text-muted-foreground">
            {restaurant.address} · Bole Road, Addis Ababa
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/50 bg-cream-100/90 px-3 py-1 font-medium text-walnut-700 shadow-sm">
              <MesobIcon className="h-3.5 w-3.5 text-gold-600" /> Communal Mesob Dining
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/50 bg-cream-100/90 px-3 py-1 font-medium text-walnut-700 shadow-sm">
              <JebenaIcon className="h-3.5 w-3.5 text-gold-600" /> Buna Coffee Ceremony
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-300/50 bg-forest-50/90 px-3 py-1 font-medium text-forest-700 shadow-sm">
              🌾 100% Teff Injera
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-300/50 bg-forest-50/90 px-3 py-1 font-medium text-forest-700 shadow-sm">
              🌱 Fasting & Vegan Selection
            </span>
          </div>

          <TibebDivider className="mt-8 max-w-lg" label="እንኳን ደህና መጡ" />
        </div>

        <div className="mb-8 text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Choose a role to sign in as</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">Each role lands on its dedicated Habesha dining workspace. Switch any time.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => {
            const Device = DEVICE_ICON[r.device];
            return (
              <button
                key={r.id}
                onClick={() => choose(r)}
                className="group card-soft mesob-card-hover relative flex flex-col gap-3 overflow-hidden p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-gold-300/80 hover:shadow-lift"
              >
                <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", ROLE_ACCENT[r.id])} />
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-700 transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                    <Device className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="font-display text-lg font-bold text-foreground">{r.name}</p>
                    <span className="text-xs font-semibold text-gold-600">{ROLE_GEEZ[r.id]}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{ROLE_BLURB[r.id]}</p>
                </div>
                <div className="mt-auto flex items-center gap-2 pt-3 text-xs border-t border-border/40">
                  <span className="rounded-full bg-sand-200 px-2.5 py-1 font-medium text-walnut-700">{r.device}</span>
                  <span className="text-muted-foreground">Lands on · {ROLE_HOME[r.id]}</span>
                </div>
              </button>
            );
          })}
        </div>

        <TibebDivider className="mt-14 max-w-md mx-auto" />

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          መሶብ ባህላዊ ምግብ ቤት · Mesob Restaurant Management Console · Bole Road, Addis Ababa · ETB Currency · All rights reserved.
        </p>
      </div>
    </div>
  );
}