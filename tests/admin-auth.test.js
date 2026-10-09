import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminAuth } from "../src/admin-auth.js";

const env = {
  ADMIN_USERNAME: "test-admin",
  ADMIN_PASSWORD: "test-only-password",
  ADMIN_SESSION_SECRET: "a-test-session-secret-with-at-least-32-characters"
};
const origin = "https://cachecourse.example";
const now = Date.UTC(2026, 9, 9, 12, 0, 0);

function loginRequest(credentials = { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD }, requestOrigin = origin) {
  return new Request(origin + "/api/admin/login", {
    method: "POST",
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
}

function sessionRequest(cookie) {
  return new Request(origin + "/api/admin/session", {
    headers: cookie ? { Cookie: cookie } : {}
  });
}

test("valid admin credentials create a secure, HttpOnly session cookie", async () => {
  const response = await handleAdminAuth(loginRequest(), { env, now });
  const cookie = response.headers.get("set-cookie");
  assert.equal(response.status, 200);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=28800/);
  assert.equal((await handleAdminAuth(sessionRequest(cookie.split(";")[0]), { env, now })).status, 200);
});

test("wrong credentials and cross-origin login attempts are rejected", async () => {
  const wrongPassword = await handleAdminAuth(loginRequest({ username: env.ADMIN_USERNAME, password: "wrong" }), { env, now });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.headers.get("set-cookie"), null);

  const wrongOrigin = await handleAdminAuth(loginRequest(undefined, "https://attacker.example"), { env, now });
  assert.equal(wrongOrigin.status, 403);
});

test("admin sessions expire and logout clears the cookie", async () => {
  const login = await handleAdminAuth(loginRequest(), { env, now });
  const cookiePair = login.headers.get("set-cookie").split(";")[0];
  const expiry = now + 8 * 60 * 60 * 1000 + 1000;
  assert.equal((await handleAdminAuth(sessionRequest(cookiePair), { env, now: expiry })).status, 401);

  const logout = await handleAdminAuth(new Request(origin + "/api/admin/logout", {
    method: "POST",
    headers: { Origin: origin }
  }), { env, now });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});

test("admin routes fail closed when server credentials are missing", async () => {
  const response = await handleAdminAuth(sessionRequest(""), { env: {} });
  assert.equal(response.status, 503);
});
