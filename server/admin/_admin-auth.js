import {createHash, createHmac, timingSafeEqual} from "node:crypto";

const COOKIE_NAME = "__Host-nimba_admin_session";
const MAX_AGE_SECONDS = 8 * 60 * 60;
const username = () => process.env.ADMIN_USERNAME || "nimba";
const digest = value => createHash("sha256").update(String(value)).digest();
const equal = (left, right) => timingSafeEqual(digest(left), digest(right));

function sign(payload) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (!secret || secret.length < 32 || !password || password.length < 20) return null;
  return createHmac("sha256", secret).update(digest(password)).update(payload).digest("base64url");
}

export function credentialsAreValid(inputUsername, password) {
  if (!sign("login")) throw new Error("Staff sign-in is not configured.");
  if (typeof inputUsername !== "string" || typeof password !== "string") return false;
  const usernameMatch = equal(inputUsername, username());
  const passwordMatch = equal(password, process.env.ADMIN_PASSWORD);
  return usernameMatch && passwordMatch;
}

export function createSession(username) {
  const payload = Buffer.from(JSON.stringify({
    username, exp: Date.now() + MAX_AGE_SECONDS * 1000
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySession(req) {
  const prefix = `${COOKIE_NAME}=`;
  const value = (req.headers.cookie || "").split(";")
    .map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length);
  const match = /^([\w-]+)\.([\w-]+)$/.exec(value || "");
  if (!match) return null;
  const [, payload, signature] = match;
  const expected = sign(payload);
  if (!expected || !equal(expected, signature)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(data.exp) && data.exp > Date.now() &&
      data.username === username() ? data : null;
  } catch {
    return null;
  }
}

function cookie(value, age) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}

export const sessionCookie = token => cookie(token, MAX_AGE_SECONDS);
export const clearSessionCookie = () => cookie("", 0);

export function requireAdmin(req, res) {
  const session = verifySession(req);
  if (!session) res.status(401).json({error: "Unauthorized"});
  return session;
}
