import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "cachecourse_admin_session";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function configuration(env) {
  const username = env.ADMIN_USERNAME;
  const password = env.ADMIN_PASSWORD;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!username || !password || !secret || secret.length < 32) return null;
  return { username, password, secret };
}

function constantTimeEqual(left, right) {
  const leftBytes = Buffer.from(String(left));
  const rightBytes = Buffer.from(String(right));
  const size = Math.max(leftBytes.length, rightBytes.length, 1);
  const paddedLeft = Buffer.alloc(size);
  const paddedRight = Buffer.alloc(size);
  leftBytes.copy(paddedLeft);
  rightBytes.copy(paddedRight);
  return timingSafeEqual(paddedLeft, paddedRight) && leftBytes.length === rightBytes.length;
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function makeToken(username, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    exp: Math.floor(now / 1000) + ADMIN_SESSION_SECONDS
  })).toString("base64url");
  return payload + "." + sign(payload, secret);
}

function getCookie(request, name) {
  const prefix = name + "=";
  const entry = (request.headers.get("cookie") || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : "";
}

function verifyToken(token, secret, now = Date.now()) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  if (!constantTimeEqual(signature, sign(payload, secret))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof session.sub !== "string" || !Number.isInteger(session.exp) || session.exp <= Math.floor(now / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function isAdminSession(request, { env = process.env, now = Date.now() } = {}) {
  const settings = configuration(env);
  if (!settings) return false;
  const token = getCookie(request, ADMIN_SESSION_COOKIE);
  const session = verifyToken(token, settings.secret, now);
  return Boolean(session && constantTimeEqual(session.sub, settings.username));
}

function validOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function cookieHeader(request, token, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return ADMIN_SESSION_COOKIE + "=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + maxAge + secure;
}

export async function handleAdminAuth(request, { env = process.env, now = Date.now() } = {}) {
  const pathname = new URL(request.url).pathname;
  const settings = configuration(env);

  if (pathname === "/api/admin/login") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, { Allow: "POST" });
    if (!validOrigin(request)) return jsonResponse({ error: "Request origin is not allowed." }, 403);
    if (!settings) return jsonResponse({ error: "Admin sign-in is not configured on this deployment." }, 503);

    let credentials;
    try {
      credentials = await request.json();
    } catch {
      return jsonResponse({ error: "Enter a username and password." }, 400);
    }

    const usernameMatches = constantTimeEqual(credentials?.username ?? "", settings.username);
    const passwordMatches = constantTimeEqual(credentials?.password ?? "", settings.password);
    if (!usernameMatches || !passwordMatches) return jsonResponse({ error: "Invalid username or password." }, 401);

    const token = makeToken(settings.username, settings.secret, now);
    return jsonResponse({ authenticated: true }, 200, {
      "Set-Cookie": cookieHeader(request, token, ADMIN_SESSION_SECONDS)
    });
  }

  if (pathname === "/api/admin/session") {
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405, { Allow: "GET" });
    if (!settings) return jsonResponse({ error: "Admin sign-in is not configured on this deployment." }, 503);
    if (!isAdminSession(request, { env, now })) return jsonResponse({ authenticated: false }, 401);
    return jsonResponse({ authenticated: true });
  }

  if (pathname === "/api/admin/logout") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, { Allow: "POST" });
    if (!validOrigin(request)) return jsonResponse({ error: "Request origin is not allowed." }, 403);
    return jsonResponse({ authenticated: false }, 200, {
      "Set-Cookie": cookieHeader(request, "", 0)
    });
  }

  return jsonResponse({ error: "Not found." }, 404);
}
