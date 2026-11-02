import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the admin sign-in is not linked or precached as part of the public app shell", async () => {
  const [home, hub, admin, serviceWorker] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../learning-hub.html", import.meta.url), "utf8"),
    readFile(new URL("../admin.html", import.meta.url), "utf8"),
    readFile(new URL("../service-worker.js", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(home, /href=["'][^"']*admin\.html/);
  assert.doesNotMatch(hub, /href=["'][^"']*admin\.html/);
  assert.match(admin, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(serviceWorker, /["']\/admin\.html["']/);
  assert.doesNotMatch(serviceWorker, /["']\/src\/admin\.js["']/);
});

test("home and admin provide their own learning and management search controls", async () => {
  const [home, admin] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../admin.html", import.meta.url), "utf8")
  ]);
  assert.match(home, /id="home-search-form"/);
  assert.match(home, /id="home-search"/);
  assert.match(admin, /id="admin-search"/);
  for (const section of ["dashboard", "users", "communities", "messages", "activity", "courses"]) {
    assert.match(admin, new RegExp('data-admin-section="' + section + '"'));
    assert.match(admin, new RegExp('data-admin-panel="' + section + '"'));
  }
});

test("activity dashboard includes accessible charts and visible-tab auto-refresh", async () => {
  const [admin, script, migration] = await Promise.all([
    readFile(new URL("../admin.html", import.meta.url), "utf8"),
    readFile(new URL("../src/admin.js", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20261102000300_admin_dashboard_analytics.sql", import.meta.url), "utf8")
  ]);
  for (const chartId of ["admin-traffic-chart", "admin-activity-chart", "admin-activity-mix-chart", "admin-popular-pages-chart"]) {
    assert.match(admin, new RegExp('id="' + chartId + '"'));
  }
  assert.match(admin, /Auto-updates every 20 seconds/);
  assert.match(admin, /id="admin-dashboard-live-status"[^>]*aria-live="polite"/);
  assert.match(script, /setInterval\(refreshDashboardWhenVisible, 20_000\)/);
  assert.match(script, /document\.hidden/);
  assert.match(script, /adminRequest\("\/api\/admin\/dashboard"\)/);
  assert.match(script, /renderDailyChart/);
  assert.match(script, /renderActivityMix/);
  assert.match(migration, /'activityByDay'/);
  assert.match(migration, /'activityByType'/);
  assert.match(migration, /'trackedEvents7d'/);
});
