"use client";
export type TraeUser = { email: string; password: string; role?: "admin" | "user" };

const USERS_KEY = "trae_users";

function getUsers(): TraeUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: TraeUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUser(email: string): TraeUser | undefined {
  const users = getUsers();
  const e = email.toLowerCase();
  return users.find((u) => u.email.toLowerCase() === e);
}

function addOrUpdateUser(user: TraeUser): TraeUser {
  const users = getUsers();
  const e = user.email.toLowerCase();
  const idx = users.findIndex((u) => u.email.toLowerCase() === e);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  saveUsers(users);
  return user;
}

function validatePassword(pw: string): { ok: boolean; error?: string } {
  const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{7,10}$/;
  if (!re.test(pw)) {
    return { ok: false, error: "Senha deve ter 7–10 caracteres, letras e números." };
  }
  return { ok: true };
}

function seedAdmin() {
  const adminEmail = "edbck.claudio@gmail.com";
  const adminPass = "casa137";
  const existing = findUser(adminEmail);
  if (!existing) {
    addOrUpdateUser({ email: adminEmail, password: adminPass, role: "admin" });
  }
}

function setAuth(email: string) {
  document.cookie = `traeAuth=${encodeURIComponent(email)}; path=/; max-age=${60 * 60 * 24 * 7}`;
  localStorage.setItem("trae_email", email);
}

function clearAuth() {
  document.cookie = "traeAuth=; path=/; max-age=0";
  localStorage.removeItem("trae_email");
}

function getCurrentUser(): TraeUser | null {
  const email = typeof window !== "undefined" ? localStorage.getItem("trae_email") : null;
  if (!email) return null;
  const u = findUser(email);
  return u || null;
}

function login(email: string, password: string): { ok: boolean; role?: "admin" | "user"; error?: string } {
  const u = findUser(email);
  if (!u) return { ok: false, error: "Usuário não encontrado" };
  if (u.password !== password) return { ok: false, error: "Senha inválida" };
  setAuth(u.email);
  return { ok: true, role: u.role || "user" };
}

function register(email: string, password: string): { ok: boolean; error?: string } {
  const v = validatePassword(password);
  if (!v.ok) return { ok: false, error: v.error };
  if (findUser(email)) return { ok: false, error: "Email já cadastrado" };
  addOrUpdateUser({ email, password, role: "user" });
  return { ok: true };
}

export {
  USERS_KEY,
  getUsers,
  saveUsers,
  findUser,
  addOrUpdateUser,
  validatePassword,
  seedAdmin,
  setAuth,
  clearAuth,
  getCurrentUser,
  login,
  register,
};