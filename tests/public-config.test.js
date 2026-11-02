import test from "node:test";
import assert from "node:assert/strict";
import { handlePublicConfig } from "../src/public-config.js";

test("public configuration exposes only browser-safe Supabase settings", async () => {
  const response = handlePublicConfig(new Request("http://localhost/api/public-config"), {
    SUPABASE_URL: "https://project.example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-test"
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    supabaseUrl: "https://project.example.supabase.co",
    publishableKey: "sb_publishable_test"
  });
});

test("public configuration accepts the legacy anon key variable", async () => {
  const response = handlePublicConfig(new Request("http://localhost/api/public-config"), {
    SUPABASE_URL: "https://project.example.supabase.co",
    SUPABASE_ANON_KEY: "anon-test"
  });

  assert.deepEqual(await response.json(), {
    supabaseUrl: "https://project.example.supabase.co",
    publishableKey: "anon-test"
  });
});

test("public configuration rejects non-GET requests", async () => {
  const response = handlePublicConfig(new Request("http://localhost/api/public-config", { method: "POST" }), {});

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});
