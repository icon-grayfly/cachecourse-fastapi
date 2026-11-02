import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminAuth } from "../src/admin-auth.js";
import { handleAdminAPI } from "../src/admin-api.js";

const adminEnv = {
  ADMIN_USERNAME: "global-admin",
  ADMIN_PASSWORD: "test-password-only",
  ADMIN_SESSION_SECRET: "a-test-session-secret-with-more-than-32-characters",
  SUPABASE_URL: "https://project.example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "server-side-test-key"
};

async function adminCookie() {
  const response = await handleAdminAuth(new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({ username: adminEnv.ADMIN_USERNAME, password: adminEnv.ADMIN_PASSWORD })
  }), { env: adminEnv });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}

test("admin data APIs require the server-verified administrator session", async () => {
  const response = await handleAdminAPI(new Request("http://localhost/api/admin/users"), { env: adminEnv });
  assert.equal(response.status, 401);
});

test("admin data APIs fail clearly until a server-only Supabase key is configured", async () => {
  const cookie = await adminCookie();
  const response = await handleAdminAPI(new Request("http://localhost/api/admin/users", {
    headers: { Cookie: cookie }
  }), { env: { ...adminEnv, SUPABASE_SERVICE_ROLE_KEY: "" } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("admin mutations reject cross-origin requests", async () => {
  const cookie = await adminCookie();
  const response = await handleAdminAPI(new Request("https://app.example/api/admin/messages", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "https://attacker.example",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userId: "2f6d1410-c6e9-4da9-a9d1-1b31605c34bc", body: "Hello" })
  }), { env: adminEnv });
  assert.equal(response.status, 403);
});

test("dashboard data is fetched server-side and never returns the service key", async () => {
  const cookie = await adminCookie();
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    const body = String(url).includes("admin_dashboard_summary")
      ? { users: 12, visits: 40, activeLearners7d: 3, recentVisits: [], popularPages: [] }
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await handleAdminAPI(new Request("https://app.example/api/admin/dashboard", {
      headers: { Cookie: cookie }
    }), { env: adminEnv });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.users, 12);
    assert.equal(body.visits, 40);
    assert.ok(requests.every((request) => request.options.headers.apikey === adminEnv.SUPABASE_SERVICE_ROLE_KEY));
    assert.doesNotMatch(JSON.stringify(body), /server-side-test-key/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
