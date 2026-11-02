import { isAdminSession } from "./admin-auth.js";

class AdminAPIError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function settings(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function requireIdentifier(value, label) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(value)) {
    throw new AdminAPIError("A valid " + label + " is required.");
  }
  return value;
}

function requireUUID(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AdminAPIError("A valid " + label + " is required.");
  }
  return value;
}

async function supabaseRequest(config, pathname, { method = "GET", body, prefer, headers = {} } = {}) {
  const response = await fetch(config.url + pathname, {
    method,
    headers: {
      apikey: config.key,
      Authorization: "Bearer " + config.key,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = text;
  }
  if (!response.ok) {
    const message = typeof result?.message === "string"
      ? result.message
      : typeof result?.msg === "string" ? result.msg : "The data service rejected the admin request.";
    throw new AdminAPIError(message, response.status >= 500 ? 502 : 400);
  }
  return { result, response };
}

async function getUsers(config) {
  const users = [];
  for (let page = 1; page <= 1000; page += 1) {
    const query = new URLSearchParams({ page: String(page), per_page: "1000" });
    const { result } = await supabaseRequest(config, "/auth/v1/admin/users?" + query);
    const batch = Array.isArray(result?.users) ? result.users : [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  const [profiles, memberships] = await Promise.all([
    supabaseRequest(config, "/rest/v1/community_profiles?select=id,display_name,activity_tracking_enabled").then(({ result }) => result || []),
    supabaseRequest(config, "/rest/v1/community_memberships?select=user_id,group_id,joined_at,community_groups(name)").then(({ result }) => result || [])
  ]);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const membershipsByUser = new Map();
  for (const membership of memberships) {
    const entries = membershipsByUser.get(membership.user_id) || [];
    entries.push({
      groupId: membership.group_id,
      name: membership.community_groups?.name || membership.group_id,
      joinedAt: membership.joined_at
    });
    membershipsByUser.set(membership.user_id, entries);
  }
  return users.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: user.email || "",
      displayName: profile?.display_name || user.user_metadata?.display_name || "Learner",
      createdAt: user.created_at || null,
      lastSignInAt: user.last_sign_in_at || null,
      suspended: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()),
      activityTrackingEnabled: profile?.activity_tracking_enabled !== false,
      communities: membershipsByUser.get(user.id) || []
    };
  }).sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function assertMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      throw new AdminAPIError("Request origin is not allowed.", 403);
    }
  } catch (error) {
    if (error instanceof AdminAPIError) throw error;
    throw new AdminAPIError("Request origin is not allowed.", 403);
  }
}

async function readJson(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new AdminAPIError("Send a valid JSON request body.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminAPIError("Send a JSON object.");
  }
  return body;
}

async function routeRequest(request, config) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  if (path === "/api/admin/dashboard" && method === "GET") {
    const [{ result: summary }, { result: recentEvents }] = await Promise.all([
      supabaseRequest(config, "/rest/v1/rpc/admin_dashboard_summary", { method: "POST", body: {} }),
      supabaseRequest(config, "/rest/v1/activity_events?select=user_id,event_type,page_path,item_id,title,created_at&order=created_at.desc&limit=12")
    ]);
    return jsonResponse({ ...summary, recentEvents: recentEvents || [] });
  }

  if (path === "/api/admin/users" && method === "GET") {
    return jsonResponse({ users: await getUsers(config) });
  }

  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && method === "PATCH") {
    assertMutationOrigin(request);
    const userId = requireUUID(decodeURIComponent(userMatch[1]), "user id");
    const body = await readJson(request);
    if (body.displayName !== undefined && (typeof body.displayName !== "string" || body.displayName.trim().length < 2 || body.displayName.trim().length > 40)) {
      throw new AdminAPIError("Display names must contain 2 to 40 characters.");
    }
    if (body.suspended !== undefined && typeof body.suspended !== "boolean") {
      throw new AdminAPIError("Account status must be true or false.");
    }
    if (body.displayName !== undefined || body.suspended !== undefined) {
      const { result: existing } = await supabaseRequest(config, "/auth/v1/admin/users/" + encodeURIComponent(userId));
      const update = {};
      if (body.displayName !== undefined) {
        update.user_metadata = {
            ...(existing?.user?.user_metadata || existing?.user_metadata || {}),
          display_name: body.displayName.trim()
        };
      }
      if (body.suspended !== undefined) update.ban_duration = body.suspended ? "876000h" : "none";
      await supabaseRequest(config, "/auth/v1/admin/users/" + encodeURIComponent(userId), { method: "PUT", body: update });
      if (body.displayName !== undefined) {
        await supabaseRequest(config, "/rest/v1/community_profiles?id=eq." + encodeURIComponent(userId), {
          method: "PATCH",
          body: { display_name: body.displayName.trim() },
          prefer: "return=minimal"
        });
      }
    }
    return jsonResponse({ updated: true });
  }

  if (path === "/api/admin/communities" && method === "GET") {
    const [{ result: groups }, { result: memberships }, { result: requests }, { result: profiles }] = await Promise.all([
      supabaseRequest(config, "/rest/v1/community_groups?select=id,name,summary,active,created_at&order=name.asc"),
      supabaseRequest(config, "/rest/v1/community_memberships?select=user_id,group_id,joined_at&order=joined_at.desc"),
      supabaseRequest(config, "/rest/v1/community_membership_requests?select=id,user_id,group_id,status,created_at,reviewed_at&order=created_at.desc"),
      supabaseRequest(config, "/rest/v1/community_profiles?select=id,display_name")
    ]);
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));
    const membersByGroup = new Map();
    for (const membership of memberships || []) {
      const members = membersByGroup.get(membership.group_id) || [];
      members.push({
        userId: membership.user_id,
        name: profileById.get(membership.user_id) || "Learner",
        email: "",
        joinedAt: membership.joined_at
      });
      membersByGroup.set(membership.group_id, members);
    }
    const groupById = new Map((groups || []).map((group) => [group.id, group]));
    const mappedRequests = (requests || []).map((request) => ({
      ...request,
      userName: profileById.get(request.user_id) || "Learner",
      groupName: groupById.get(request.group_id)?.name || request.group_id
    }));
    return jsonResponse({
      groups: (groups || []).map((group) => ({ ...group, members: membersByGroup.get(group.id) || [] })),
      requests: mappedRequests
    });
  }

  const communityMatch = path.match(/^\/api\/admin\/communities\/([^/]+)$/);
  if (communityMatch && method === "PATCH") {
    assertMutationOrigin(request);
    const groupId = requireIdentifier(decodeURIComponent(communityMatch[1]), "community id");
    const body = await readJson(request);
    const update = {};
    if (typeof body.active === "boolean") update.active = body.active;
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
        throw new AdminAPIError("Community names must contain 1 to 100 characters.");
      }
      update.name = body.name.trim();
    }
    if (body.summary !== undefined) {
      if (typeof body.summary !== "string" || body.summary.trim().length > 500) {
        throw new AdminAPIError("Community summaries must be no longer than 500 characters.");
      }
      update.summary = body.summary.trim();
    }
    if (!Object.keys(update).length) throw new AdminAPIError("No community changes were supplied.");
    await supabaseRequest(config, "/rest/v1/community_groups?id=eq." + encodeURIComponent(groupId), {
      method: "PATCH",
      body: update,
      prefer: "return=minimal"
    });
    return jsonResponse({ updated: true });
  }

  const requestMatch = path.match(/^\/api\/admin\/membership-requests\/(\d+)$/);
  if (requestMatch && method === "POST") {
    assertMutationOrigin(request);
    const requestId = Number(requestMatch[1]);
    const body = await readJson(request);
    if (!["approve", "decline"].includes(body.action)) throw new AdminAPIError("Choose approve or decline.");
    const { result: requestRecord } = await supabaseRequest(
      config,
      "/rest/v1/community_membership_requests?id=eq." + requestId + "&status=eq.pending&select=id,user_id,group_id"
    );
    if (!requestRecord?.length) throw new AdminAPIError("This membership request is no longer pending.", 404);
    const membershipRequest = requestRecord[0];
    if (body.action === "approve") {
      await supabaseRequest(config, "/rest/v1/community_memberships", {
        method: "POST",
        body: { user_id: membershipRequest.user_id, group_id: membershipRequest.group_id },
        prefer: "resolution=merge-duplicates,return=minimal"
      });
    }
    await supabaseRequest(config, "/rest/v1/community_membership_requests?id=eq." + requestId, {
      method: "PATCH",
      body: { status: body.action === "approve" ? "approved" : "declined", reviewed_at: new Date().toISOString() },
      prefer: "return=minimal"
    });
    return jsonResponse({ status: body.action === "approve" ? "approved" : "declined" });
  }

  if (path === "/api/admin/memberships" && method === "DELETE") {
    assertMutationOrigin(request);
    const userId = requireUUID(url.searchParams.get("userId"), "user id");
    const groupId = requireIdentifier(url.searchParams.get("groupId"), "community id");
    await supabaseRequest(
      config,
      "/rest/v1/community_memberships?user_id=eq." + encodeURIComponent(userId) + "&group_id=eq." + encodeURIComponent(groupId),
      { method: "DELETE", prefer: "return=minimal" }
    );
    return jsonResponse({ removed: true });
  }

  if (path === "/api/admin/activity" && method === "GET") {
    const userId = requireUUID(url.searchParams.get("userId"), "user id");
    const query = new URLSearchParams({
      select: "user_id,event_type,page_path,item_id,title,created_at",
      user_id: "eq." + userId,
      order: "created_at.desc",
      limit: "1000"
    });
    const { result } = await supabaseRequest(config, "/rest/v1/activity_events?" + query);
    return jsonResponse({ events: result || [] });
  }

  if (path === "/api/admin/messages" && method === "GET") {
    const userId = url.searchParams.get("userId");
    const query = new URLSearchParams({
      select: "id,user_a_id,user_b_id,sender_id,recipient_id,sender_is_admin,group_id,body,created_at",
      order: "created_at.desc",
      limit: "500"
    });
    if (userId) {
      query.set("user_a_id", "eq." + requireUUID(userId, "user id"));
      query.set("user_b_id", "is.null");
    } else {
      query.set("sender_is_admin", "eq.true");
    }
    const { result } = await supabaseRequest(config, "/rest/v1/community_direct_messages?" + query);
    return jsonResponse({ messages: result || [] });
  }

  if (path === "/api/admin/messages" && method === "POST") {
    assertMutationOrigin(request);
    const body = await readJson(request);
    const userId = requireUUID(body.userId, "recipient id");
    if (typeof body.body !== "string" || !body.body.trim() || body.body.trim().length > 2000) {
      throw new AdminAPIError("Messages must contain 1 to 2,000 characters.");
    }
    await supabaseRequest(config, "/rest/v1/community_direct_messages", {
      method: "POST",
      body: {
        user_a_id: userId,
        user_b_id: null,
        sender_id: null,
        recipient_id: userId,
        sender_is_admin: true,
        body: body.body.trim()
      },
      prefer: "return=minimal"
    });
    return jsonResponse({ sent: true }, 201);
  }

  return jsonResponse({ error: "Not found." }, 404);
}

export async function handleAdminAPI(request, { env = process.env } = {}) {
  if (!request.url.startsWith("http")) return jsonResponse({ error: "Invalid request URL." }, 400);
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api/admin/") || ["/api/admin/login", "/api/admin/logout", "/api/admin/session"].includes(pathname)) {
    return jsonResponse({ error: "Not found." }, 404);
  }
  if (!isAdminSession(request, { env })) return jsonResponse({ error: "Admin authentication is required." }, 401);
  const config = settings(env);
  if (!config) return jsonResponse({ error: "Admin data access is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server." }, 503);
  try {
    return await routeRequest(request, config);
  } catch (error) {
    if (error instanceof AdminAPIError) return jsonResponse({ error: error.message }, error.status);
    console.error("Admin API request failed:", error?.message || error);
    return jsonResponse({ error: "The admin request failed. Check the Supabase setup and try again." }, 502);
  }
}
