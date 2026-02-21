import { createCookieSessionStorage, redirect } from "react-router";
import bcrypt from "bcryptjs";
import { prisma } from "./db.server.js";

// ─── Session Storage ─────────────────────────────────────
// This creates a cookie-based session. The cookie is signed
// with SESSION_SECRET so users can't tamper with it.

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true, // JS can't read the cookie (XSS protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "lax", // prevents CSRF from other sites
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    secrets: [process.env.SESSION_SECRET!],
  },
});

// ─── Helper: get session from request ────────────────────
function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

// ─── Signup ──────────────────────────────────────────────
// Hash the password and create a new user in the database.

export async function signup(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  return user;
}

// ─── Login ───────────────────────────────────────────────
// Verify email + password. Returns the user if valid, null if not.

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}

// ─── Create User Session ─────────────────────────────────
// After signup or login, create a session cookie and redirect.

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

// ─── Get Logged-In User ID ──────────────────────────────
// Returns the userId from the session cookie, or null.

export async function getUserId(request: Request) {
  const session = await getSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

// ─── Require User (Protected Routes) ────────────────────
// Call this in any loader that needs auth. Redirects to
// /login if the user isn't logged in.

export async function requireUser(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw redirect("/login");
  }

  return user;
}

// ─── Logout ──────────────────────────────────────────────
// Destroy the session cookie and redirect to home.

export async function logout(request: Request) {
  const session = await getSession(request);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
