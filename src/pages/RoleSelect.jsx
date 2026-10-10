import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Tablet, Smartphone, ChevronRight, Lock, KeyRound, Sparkles, AlertCircle } from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { useData } from "@/lib/DataContext";
import { ROLES } from "@/lib/roles";
import { MesobIcon, JebenaIcon, TibebDivider } from "@/components/HabeshaDecorations";
import Modal from "@/components/ui/Modal";
import { notifySuccess } from "@/lib/notify";
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

const DEMO_CREDENTIALS = {
  manager: { login: "owner", password: "mesob1234", name: "Dawit M. (Owner/Manager)" },
  admin: { login: "admin1", password: "mesob1234", name: "System Administrator" },
  kitchen: { login: "chef", password: "mesob1234", name: "Chef Abebe" },
  waiter: { login: "selam", password: "mesob1234", name: "Selam T. (Floor Waiter)" },
  inventory: { login: "yonas", password: "mesob1234", name: "Yonas K. (Inventory Officer)" },
  cleaner: { login: "tigist", password: "mesob1234", name: "Tigist A. (Lead Cleaner)" },
  security: { login: "robel", password: "mesob1234", name: "Robel S. (Security Head)" },
};

const MURAL = "/images/role-mural.png";
const ARCHWAY = "/images/role-archway.png";

export default function RoleSelect() {
  const { setRole, login } = useRole();
  const { db } = useData();
  const { restaurant } = db;
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOfflineOption, setShowOfflineOption] = useState(false);

  const openLogin = (r) => {
    setActiveRole(r);
    const demo = DEMO_CREDENTIALS[r.id];
    setUsername(demo?.login || "");
    setPassword(demo?.password || "");
    setError("");
    setShowOfflineOption(false);
  };

  const handleFillDemo = () => {
    if (!activeRole) return;
    const demo = DEMO_CREDENTIALS[activeRole.id];
    if (demo) {
      setUsername(demo.login);
      setPassword(demo.password);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError("");
    setShowOfflineOption(false);

    try {
      await login({ login: username.trim(), password });
      notifySuccess(`Signed in successfully as ${username}`);
      navigate(activeRole?.home || "/dashboard");
    } catch (err) {
      const msg = err.message || "Failed to sign in";
      setError(msg);
      // If server is not reachable, surface offline mode option
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("refused") ||
        msg.includes("500")
      ) {
        setShowOfflineOption(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineBypass = () => {
    if (activeRole) {
      setRole(activeRole.id);
      navigate(activeRole.home);
    }
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
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Sign in to your staff workspace</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">Select your role to authenticate securely with your staff credentials.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => {
            const Device = DEVICE_ICON[r.device];
            return (
              <button
                key={r.id}
                onClick={() => openLogin(r)}
                className="group card-soft mesob-card-hover relative flex flex-col gap-3 overflow-hidden p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-gold-300/80 hover:shadow-lift"
              >
                <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", ROLE_ACCENT[r.id])} />
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100 text-gold-700 transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                    <Device className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary font-medium">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Sign in</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="font-display text-lg font-bold text-foreground">{r.name}</p>
                    <span className="text-xs font-semibold text-gold-600">{ROLE_GEEZ[r.id]}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{ROLE_BLURB[r.id]}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3 text-xs border-t border-border/40">
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

      {/* Staff Authentication Modal */}
      {activeRole && (
        <Modal
          title={`Sign in as ${activeRole.name}`}
          description={`Authenticate to access the ${activeRole.name} (${ROLE_GEEZ[activeRole.id]}) workspace.`}
          onClose={() => setActiveRole(null)}
          size="sm"
          onSubmit={handleSubmit}
          footer={
            <div className="flex w-full flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center"
              >
                <KeyRound className="h-4 w-4" />
                <span>{loading ? "Authenticating…" : "Sign In"}</span>
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="inline-flex items-center gap-1 font-medium text-gold-700 hover:text-gold-900 transition underline underline-offset-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Use demo credentials</span>
                </button>
                <button
                  type="button"
                  onClick={handleOfflineBypass}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  Offline mode →
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 py-1">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-berbere-200 bg-berbere-50 p-3 text-sm text-berbere-800">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-berbere-600" />
                <div className="flex-1">
                  <p className="font-medium">{error}</p>
                  {showOfflineOption && (
                    <button
                      type="button"
                      onClick={handleOfflineBypass}
                      className="mt-2 text-xs font-semibold text-berbere-900 underline underline-offset-2 hover:opacity-80"
                    >
                      Click here to enter in offline demo mode
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-username" className="block text-xs font-semibold text-foreground mb-1.5">
                Username or Staff Email
              </label>
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. owner, admin1, selam"
                className="input-soft w-full"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-foreground mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="input-soft w-full"
              />
            </div>

            {DEMO_CREDENTIALS[activeRole.id] && (
              <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Seeded Account: <span className="font-mono text-gold-700">{DEMO_CREDENTIALS[activeRole.id].login}</span>
                </p>
                <p className="mt-0.5 text-2xs">
                  Default Password: <span className="font-mono font-semibold">mesob1234</span>
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}