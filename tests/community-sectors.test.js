import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMMUNITY_SECTORS, getCommunitySector } from "../src/community-sectors.js";

test("the Community has exactly ten distinct in-page professional sectors", async () => {
  assert.equal(COMMUNITY_SECTORS.length, 10);
  assert.equal(new Set(COMMUNITY_SECTORS.map((sector) => sector.id)).size, 10);
  assert.ok(COMMUNITY_SECTORS.every((sector) => sector.name && sector.summary));
  assert.equal(getCommunitySector("oil-gas-energy")?.name, "Oil, Gas & Energy");
  assert.equal(getCommunitySector("not-a-sector"), undefined);

  const page = await readFile(new URL("../community.html", import.meta.url), "utf8");
  assert.match(page, /id="community-sector-grid"/);
  assert.match(page, /id="community-sector-view"/);
  assert.match(page, /id="community-login-button"[^>]*>Log in<\/button>/);
  assert.match(page, /id="community-signup-button"[^>]*>Sign Up<\/button>/);
  assert.match(page, /id="community-account-button"/);
  assert.match(page, /id="community-account-dialog"/);
  assert.match(page, /id="community-chat-auth-form"/);
  assert.match(page, /id="community-profile-favourites-list"/);
  assert.match(page, /id="community-forgot-password"/);
  assert.match(page, /id="community-profile-avatar-file"/);
  assert.match(page, /id="community-profile-avatar-remove"/);
  assert.match(page, /data-community-module="overview"/);
  assert.match(page, /data-community-module="chat"/);
  assert.match(page, /data-community-module="members"/);
  assert.match(page, /data-community-module="messages"/);
  const community = await readFile(new URL("../src/community-chat.js", import.meta.url), "utf8");
  assert.match(community, /action\.textContent = "Join Group"/);
  assert.doesNotMatch(community, /action\.textContent = "Open group"/);
  assert.match(community, /resetPasswordForEmail/);
  assert.match(community, /updateUser\(\{ password \}\)/);
  assert.match(community, /mode === "signin" \? "New here\? Sign Up"/);
  assert.match(community, /All ten group choices are listed/);
  assert.match(community, /createSignedUrl\(path, 300\)/);
  const hub = await readFile(new URL("../learning-hub.html", import.meta.url), "utf8");
  assert.match(hub, /id="favorite-list-open"/);
  assert.match(hub, /id="favorite-list-dialog"/);
  assert.match(page, /href="#sector-groups"/);
});

test("profile photos use private storage and shared-community access policies", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261102000200_community_profile_avatars.sql", import.meta.url),
    "utf8"
  );
  assert.match(migration, /public = false/);
  assert.match(migration, /file_size_limit[\s\S]*5242880/);
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(migration, /create policy "Community members can view shared profile photos"/);
  assert.match(migration, /owner_membership\.group_id = viewer_membership\.group_id/);
  assert.match(migration, /create policy "Users can upload their own profile photo"/);
  assert.match(migration, /create policy "Users can replace their own profile photo"/);
  assert.match(migration, /create policy "Users can remove their own profile photo"/);
  assert.match(migration, /avatar-\[0-9a-f\]/);
});

test("group membership and messages are protected by database policies", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261101000300_community_sector_groups.sql", import.meta.url),
    "utf8"
  );
  assert.match(migration, /user_id uuid primary key references auth\.users/);
  assert.match(migration, /create policy "Group members can read messages/);
  assert.match(migration, /create policy "Group members can send messages/);
  assert.match(migration, /create function public\.join_community_group/);
  assert.match(migration, /'sector-' \|\| group_id/);
  assert.match(migration, /create policy "Moderators can redact group messages"/);
  assert.match(migration, /body = 'Message removed by a moderator\.'/);
  assert.match(migration, /revoke delete on public\.community_messages from authenticated/);
});

test("additional community access, private messages, and learner activity are policy-protected", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261102000100_admin_platform_management.sql", import.meta.url),
    "utf8"
  );
  assert.match(migration, /primary key \(user_id, group_id\)/);
  assert.match(migration, /create table public\.community_membership_requests/);
  assert.match(migration, /return 'requested'/);
  assert.match(migration, /create policy "Learners can message other members of their community"/);
  assert.match(migration, /create policy "Direct message participants can read their conversations"/);
  assert.match(migration, /create table public\.activity_events/);
  assert.match(migration, /activity_tracking_enabled/);
  assert.match(migration, /create function public\.record_platform_visit/);
  assert.match(migration, /create function public\.admin_dashboard_summary/);

  const page = await readFile(new URL("../community.html", import.meta.url), "utf8");
  assert.match(page, /id="community-profile-inbox"/);
  assert.match(page, /id="community-direct-message-dialog"/);
  assert.match(page, /id="community-member-list"/);
});
