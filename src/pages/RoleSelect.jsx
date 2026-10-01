import React from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Tablet, Smartphone, ChevronRight } from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { ROLES, restaurant } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const DEVICE_ICON = { Desktop: Monitor, Tablet: Tablet, Phone: Smartphone };
const ROLE_HOME = {
  manager: "Dashboard", admin: "User management", kitchen: "Kitchen queue",
  waiter: "Tables & orders", inventory: "Inventory list", cleaner: "My tasks", security: "Visitor register",
};
const ROLE_BLURB = {
  manager: "Owns all operations, reports, settings and employees.",
  admin: "Manages user accounts, roles and passwords only.",
  kitchen: "Prepares tickets, toggles availability, edits recipes.",
  waiter: "Takes orders, serves, records payments.",
  inventory: "Handles stock, suppliers, purchases and own expenses.",
  cleaner: "Performs cleaning tasks from a shared queue.",
  security: "Records visitors, incidents and lost items.",
};
const ROLE_ACCENT = {
  manager: "from-terracotta to-berbere",
  admin: "from-walnut to-wood",
  kitchen: "from-berbere to-terracotta",
  waiter: "from-sage to-wood",
  inventory: "from-sage to-terracotta",
  cleaner: "from-gold to-terracotta",
  security: "from-wood to-walnut",
};

const MURAL = "/images/role-mural.png";
const ARCHWAY = "/images/role-archway.png";

export default function RoleSelect() {
  const { setRole } = useRole();
  const navigate = useNavigate();

  const choose = (r) => {
    setRole(r.id);
    navigate(r.home);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ambient warm light cones */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bloom-gold blur-2xl" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bloom-sage blur-2xl" />
        <div className="absolute -bottom-16 right-0 h-96 w-96 rounded-full bg-terracotta/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {/* Hero — archway-framed mural, like the recessed arches in the reference */}
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="relative mb-7">
            <div
              className="arch-frame relative flex h-44 w-44 items-end justify-center sm:h-52 sm:w-52"
              style={{ backgroundImage: `linear-gradient(to bottom, rgba(79,54,36,0.05), rgba(245,240,232,0.92)), url(${ARCHWAY})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 arch-top bg-gradient-to-b from-transparent via-transparent to-card" />
              <img src={MURAL} alt="" className="relative h-36 w-36 rounded-t-[9999px] rounded-b-lg object-cover shadow-warm sm:h-44 sm:w-44" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            <span className="text-gold-gradient">{restaurant.name}</span>
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.25em] text-muted-foreground">{restaurant.tagline}</p>
          <div className="rule-gold mt-6 max-w-[14rem]" />
        </div>

        <div className="mb-10 text-center">
          <h2 className="font-display text-xl font-medium tracking-tight">Choose a role to sign in as</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Each role lands on its own workspace with its own navigation. Switch any time.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => {
            const Device = DEVICE_ICON[r.device];
            return (
              <button
                key={r.id}
                onClick={() => choose(r)}
                className="group card-soft relative flex flex-col gap-3 overflow-hidden p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", ROLE_ACCENT[r.id])} />
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-600 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Device className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">{r.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{ROLE_BLURB[r.id]}</p>
                </div>
                <div className="mt-auto flex items-center gap-2 pt-3 text-xs">
                  <span className="rounded-full bg-sand-200 px-2.5 py-1 font-medium text-walnut-600">{r.device}</span>
                  <span className="text-muted-foreground">Lands on · {ROLE_HOME[r.id]}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-12 text-center text-xs leading-relaxed text-muted-foreground">
          Demo console · ETB · Africa/Addis_Ababa · English · This is a UI/UX preview with sample data.
        </p>
      </div>
    </div>
  );
}