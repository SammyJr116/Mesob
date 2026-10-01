const USERS_KEY = "rms_users";
const SESSION_KEY = "rms_session";
const RESET_KEY = "rms_password_resets";

const DEMO_EMAIL = "demo@mesob.restaurant";
const DEMO_PASSWORD = "mesob1234";

const isBrowser = () => typeof window !== "undefined";

function readJson(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode / quota) — auth simply stays in-memory for the session.
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

function seedDemoUser() {
  const users = readJson(USERS_KEY, null);
  if (users) return users;
  const seeded = [
    {
      id: "demo-user",
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      full_name: "Demo Manager",
      role: "admin",
      provider: "credentials",
      created_at: new Date().toISOString(),
    },
  ];
  writeJson(USERS_KEY, seeded);
  return seeded;
}

export const demoCredentials = { email: DEMO_EMAIL, password: DEMO_PASSWORD };

export async function signUpWithEmailPassword({ email, password, full_name = "" }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) throw new Error("Email and password are required");

  const users = seedDemoUser();
  if (users.some((u) => u.email === normalized)) {
    throw new Error("An account with that email already exists");
  }

  const user = {
    id: `usr_${Math.random().toString(36).slice(2, 10)}`,
    email: normalized,
    password,
    full_name: full_name || normalized.split("@")[0],
    role: "user",
    provider: "credentials",
    created_at: new Date().toISOString(),
  };
  writeJson(USERS_KEY, [...users, user]);
  writeJson(SESSION_KEY, { id: user.id });
  return publicUser(user);
}

export async function loginWithEmailPassword(email, password) {
  const normalized = normalizeEmail(email);
  const users = seedDemoUser();
  const user = users.find((u) => u.email === normalized);
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password");
  }
  writeJson(SESSION_KEY, { id: user.id });
  return publicUser(user);
}

export async function loginWithGoogle() {
  const normalized = `${DEMO_EMAIL}`;
  const users = seedDemoUser();
  let user = users.find((u) => u.email === normalized);
  if (!user) {
    user = {
      id: `usr_${Math.random().toString(36).slice(2, 10)}`,
      email: normalized,
      password: DEMO_PASSWORD,
      full_name: "Demo Manager",
      role: "admin",
      provider: "google",
      created_at: new Date().toISOString(),
    };
    writeJson(USERS_KEY, [...users, user]);
  }
  writeJson(SESSION_KEY, { id: user.id });
  return publicUser(user);
}

export async function getCurrentUser() {
  const session = readJson(SESSION_KEY, null);
  if (!session?.id) return null;
  const users = seedDemoUser();
  const user = users.find((u) => u.id === session.id);
  return publicUser(user || null);
}

export async function signOut() {
  if (isBrowser()) window.localStorage.removeItem(SESSION_KEY);
}

export async function requestPasswordReset(email) {
  const normalized = normalizeEmail(email);
  const resets = readJson(RESET_KEY, {});
  resets[normalized] = { token: `rst_${Math.random().toString(36).slice(2, 10)}`, requested_at: new Date().toISOString() };
  writeJson(RESET_KEY, resets);
  return resets[normalized].token;
}

export async function resetPassword({ resetToken, newPassword }) {
  if (!newPassword) throw new Error("A new password is required");
  const resets = readJson(RESET_KEY, {});
  const entry = Object.entries(resets).find(([, v]) => v.token === resetToken);
  if (!entry) throw new Error("This reset link is invalid or has expired");

  const [email] = entry;
  const users = seedDemoUser().map((u) => (u.email === email ? { ...u, password: newPassword } : u));
  writeJson(USERS_KEY, users);
  delete resets[email];
  writeJson(RESET_KEY, resets);
  return publicUser(users.find((u) => u.email === email));
}