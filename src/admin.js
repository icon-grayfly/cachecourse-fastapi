import { COURSES } from "./catalog.js";
import { PROGRAMMES } from "./programmes.js";
import { deleteLocalCourse, exportLocalCatalog, getLocalCourses, importLocalCatalog, saveLocalCourse } from "./catalog-store.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#course-form");
const materialsList = $("#materials-list");
const materialTemplate = $("#material-template");
const status = $("#admin-status");
const loginPanel = $("#admin-login");
const loginForm = $("#admin-login-form");
const loginStatus = $("#admin-login-status");
const loginButton = $("#admin-login-submit");
const workspace = $("#admin-workspace");
const logoutButton = $("#admin-logout");
const consoleStatus = $("#admin-console-status");
const adminSearch = $("#admin-search");
const userList = $("#admin-users-list");
const communityList = $("#admin-communities-list");
const requestList = $("#admin-membership-requests");
const activityList = $("#admin-activity-list");
const messageUserSelect = $("#admin-message-user");
const messageHistory = $("#admin-message-history");
let adminUsers = [];
let adminCommunities = [];
let editingId = "";
let dashboardRefreshInFlight = false;
let dashboardPollTimer;
let adminAuthenticated = false;
const chartColors = ["#4c8061", "#d4915a", "#758dc4"];

function svgElement(tag, attributes = {}, text) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatMetric(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function utcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildRecentDays(rows, valueKey) {
  const byDate = new Map((rows || []).map((row) => [row.visit_date || row.activity_date, Number(row[valueKey]) || 0]));
  const today = new Date();
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const key = utcDayKey(date);
    days.push({
      key,
      date,
      value: byDate.get(key) || 0,
      label: new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(date)
    });
  }
  return days;
}

function renderDailyChart(svg, days, { title, valueLabel, color, line = false }) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", "0 0 640 220");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.append(svgElement("title", {}, title));
  const description = days.map((day) => day.label + ": " + formatMetric(day.value)).join("; ");
  svg.append(svgElement("desc", {}, description || "No activity recorded."));
  const left = 58;
  const right = 612;
  const top = 31;
  const bottom = 174;
  const height = bottom - top;
  const maximum = Math.max(1, ...days.map((day) => day.value));
  const scaleMaximum = maximum === 1 ? 1 : Math.ceil(maximum / 4) * 4;

  for (let index = 0; index <= 4; index += 1) {
    const y = bottom - height * index / 4;
    svg.append(svgElement("line", { x1: left, y1: y, x2: right, y2: y, class: "admin-chart-gridline" }));
    svg.append(svgElement("text", { x: left - 10, y: y + 3, "text-anchor": "end", class: "admin-chart-axis-label" }, formatMetric(scaleMaximum * index / 4)));
  }

  const step = (right - left) / days.length;
  const points = [];
  days.forEach((day, index) => {
    const center = left + step * (index + 0.5);
    const barHeight = day.value ? Math.max(3, height * day.value / scaleMaximum) : 0;
    const y = bottom - barHeight;
    if (line) {
      points.push(center + "," + y);
      if (!day.value) {
        svg.append(svgElement("circle", { cx: center, cy: bottom, r: 3, fill: color, class: "admin-chart-point" }));
      }
    } else {
      svg.append(svgElement("rect", {
        x: center - 17, y, width: 34, height: barHeight, rx: 5, fill: color,
        class: "admin-chart-bar"
      }));
      if (day.value) {
        svg.append(svgElement("text", { x: center, y: y - 7, "text-anchor": "middle", class: "admin-chart-value" }, formatMetric(day.value)));
      }
    }
    svg.append(svgElement("text", { x: center, y: bottom + 22, "text-anchor": "middle", class: "admin-chart-axis-label" }, day.label));
    svg.append(svgElement("text", {
      x: center, y: bottom + 38, "text-anchor": "middle", class: "admin-chart-date-label"
    }, new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(day.date)));
  });

  if (line && points.length) {
    svg.append(svgElement("polyline", { points: points.join(" "), class: "admin-chart-line", stroke: color }));
    days.forEach((day, index) => {
      const center = left + step * (index + 0.5);
      const y = bottom - (day.value ? Math.max(3, height * day.value / scaleMaximum) : 0);
      svg.append(svgElement("circle", {
        cx: center, cy: y, r: day.value ? 4.5 : 3, fill: "#fffefa", stroke: color,
        class: "admin-chart-point"
      }));
    });
  }

  if (!days.some((day) => day.value)) {
    svg.append(svgElement("text", { x: 335, y: 104, "text-anchor": "middle", class: "admin-chart-empty" }, "No " + valueLabel + " recorded yet"));
  }
}

function renderActivityMix(svg, legend, types) {
  svg.replaceChildren();
  legend.replaceChildren();
  svg.setAttribute("viewBox", "0 0 140 140");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.append(svgElement("title", {}, "Study activity by event type"));
  const rows = [
    { key: "page_view", label: "Page visits" },
    { key: "course_view", label: "Course views" },
    { key: "lesson_complete", label: "Lessons completed" }
  ].map((entry) => ({ ...entry, value: Number(types?.[entry.key]) || 0 }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const circumference = 2 * Math.PI * 45;
  svg.append(svgElement("circle", { cx: 70, cy: 70, r: 45, class: "admin-donut-track" }));
  let offset = 0;
  rows.forEach((row, index) => {
    const length = total ? circumference * row.value / total : 0;
    if (length) {
      svg.append(svgElement("circle", {
        cx: 70, cy: 70, r: 45, class: "admin-donut-segment",
        stroke: chartColors[index],
        "stroke-dasharray": length + " " + (circumference - length),
        "stroke-dashoffset": -offset,
        transform: "rotate(-90 70 70)"
      }));
      offset += length;
    }
    const item = document.createElement("li");
    const marker = document.createElement("span");
    marker.className = "admin-legend-marker";
    marker.style.backgroundColor = chartColors[index];
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = formatMetric(row.value);
    item.append(marker, label, value);
    legend.append(item);
  });
  svg.append(svgElement("text", { x: 70, y: 68, "text-anchor": "middle", class: "admin-donut-total" }, formatMetric(total)));
  svg.append(svgElement("text", { x: 70, y: 83, "text-anchor": "middle", class: "admin-donut-caption" }, "events"));
  if (!total) {
    svg.append(svgElement("text", { x: 70, y: 126, "text-anchor": "middle", class: "admin-chart-empty" }, "No events yet"));
  }
}

function renderPopularPagesChart(container, pages) {
  container.replaceChildren();
  const maximum = Math.max(0, ...(pages || []).map((page) => Number(page.visits) || 0));
  if (!pages?.length) {
    const empty = document.createElement("p");
    empty.className = "admin-chart-empty-message";
    empty.textContent = "Page totals will appear after visits are recorded.";
    container.append(empty);
    return;
  }
  for (const page of pages) {
    const row = document.createElement("div");
    row.className = "admin-page-chart-row";
    row.setAttribute("role", "listitem");
    const label = document.createElement("span");
    label.className = "admin-page-chart-label";
    label.textContent = page.page_path;
    const value = document.createElement("strong");
    value.textContent = formatMetric(page.visits);
    const track = document.createElement("span");
    track.className = "admin-page-chart-track";
    track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.className = "admin-page-chart-bar";
    bar.style.width = Math.max(3, (Number(page.visits) || 0) / maximum * 100) + "%";
    track.append(bar);
    row.append(label, value, track);
    container.append(row);
  }
}

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The admin service could not complete this request.");
  return result;
}

function showAdminSection(sectionName) {
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== sectionName;
  });
  document.querySelectorAll("[data-admin-section]").forEach((button) => {
    const active = button.dataset.adminSection === sectionName;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const headings = {
    dashboard: "Activity dashboard",
    users: "Platform users",
    communities: "Manage communities",
    messages: "Direct messages",
    activity: "Learner activity",
    courses: "Course catalogue"
  };
  $(".admin-console-toolbar h1").textContent = headings[sectionName] || "Admin console";
  applyAdminSearch();
}

function appendListItem(list, title, detail) {
  const item = document.createElement("li");
  const heading = document.createElement("strong");
  heading.textContent = title;
  item.append(heading);
  if (detail) {
    const description = document.createElement("span");
    description.textContent = detail;
    item.append(description);
  }
  list.append(item);
  return item;
}

function renderDashboard(summary) {
  $("#admin-metric-users").textContent = formatMetric(summary.users);
  $("#admin-metric-visits").textContent = formatMetric(summary.visits);
  $("#admin-metric-active").textContent = formatMetric(summary.activeLearners7d);
  $("#admin-metric-requests").textContent = formatMetric(summary.pendingRequests);
  $("#admin-metric-communities").textContent = formatMetric(summary.communities);
  $("#admin-metric-events").textContent = formatMetric(summary.trackedEvents7d);

  const traffic = $("#admin-traffic-list");
  traffic.replaceChildren();
  for (const day of summary.recentVisits || []) {
    appendListItem(traffic, new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(day.visit_date + "T00:00:00")), String(day.visits) + " page visits");
  }
  if (!traffic.childElementCount) appendListItem(traffic, "No visits recorded yet", "Daily totals will appear after the tracking migration is applied.");

  const popular = $("#admin-popular-pages");
  popular.replaceChildren();
  for (const page of summary.popularPages || []) appendListItem(popular, page.page_path, String(page.visits) + " visits");
  if (!popular.childElementCount) appendListItem(popular, "No page totals yet", "");

  const activityChartData = $("#admin-activity-chart-data");
  activityChartData.replaceChildren();
  for (const day of summary.activityByDay || []) {
    const date = new Date(day.activity_date + "T00:00:00");
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
    const count = document.createElement("strong");
    count.textContent = formatMetric(day.learners) + (Number(day.learners) === 1 ? " learner" : " learners");
    item.append(label, count);
    activityChartData.append(item);
  }
  if (!activityChartData.childElementCount) {
    appendListItem(activityChartData, "No learner activity recorded", "Signed-in activity appears after learners enable study-flow tracking.");
  }

  renderDailyChart($("#admin-traffic-chart"), buildRecentDays(summary.recentVisits, "visits"), {
    title: "Anonymous platform visits per day",
    valueLabel: "visits",
    color: "#4c8061"
  });
  renderDailyChart($("#admin-activity-chart"), buildRecentDays(summary.activityByDay, "learners"), {
    title: "Distinct active learners per day",
    valueLabel: "learners",
    color: "#d4915a",
    line: true
  });
  const types = Object.fromEntries((summary.activityByType || []).map((item) => [item.event_type, item.events]));
  renderActivityMix($("#admin-activity-mix-chart"), $("#admin-activity-mix-legend"), types);
  renderPopularPagesChart($("#admin-popular-pages-chart"), summary.popularPages || []);

  const recent = $("#admin-recent-events");
  recent.replaceChildren();
  const names = new Map(adminUsers.map((user) => [user.id, user.displayName]));
  for (const event of summary.recentEvents || []) {
    const label = event.title || event.item_id || event.page_path;
    appendListItem(recent, names.get(event.user_id) || "Learner", event.event_type.replaceAll("_", " ") + " · " + label + " · " + new Date(event.created_at).toLocaleString());
  }
  if (!recent.childElementCount) appendListItem(recent, "No learner activity recorded", "Signed-in learner activity appears here after the consent notice is shown.");
  applyAdminSearch();
}

function renderUsers() {
  userList.replaceChildren();
  messageUserSelect.replaceChildren(new Option("Select a platform user", ""));
  for (const user of adminUsers) {
    const option = new Option(user.displayName + " · " + user.email, user.id);
    messageUserSelect.append(option);

    const item = document.createElement("li");
    item.className = "admin-user-card";
    item.dataset.adminSearchable = [user.displayName, user.email, ...user.communities.map((group) => group.name)].join(" ").toLocaleLowerCase();
    const header = document.createElement("div");
    header.className = "admin-user-header";
    const identity = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = user.displayName;
    const email = document.createElement("span");
    email.textContent = user.email;
    identity.append(name, email);
    const status = document.createElement("span");
    status.className = user.suspended ? "admin-user-status suspended" : "admin-user-status";
    status.textContent = user.suspended ? "Suspended" : "Active";
    header.append(identity, status);
    item.append(header);

    const edit = document.createElement("form");
    edit.className = "admin-user-edit";
    edit.dataset.userId = user.id;
    const displayName = document.createElement("input");
    displayName.name = "displayName";
    displayName.value = user.displayName;
    displayName.maxLength = 40;
    displayName.minLength = 2;
    displayName.setAttribute("aria-label", "Edit display name for " + user.email);
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "text-button";
    save.textContent = "Save name";
    edit.append(displayName, save);
    item.append(edit);

    const memberships = document.createElement("ul");
    memberships.className = "admin-user-memberships";
    if (!user.communities.length) {
      const empty = document.createElement("li");
      empty.textContent = "No community memberships";
      memberships.append(empty);
    }
    for (const group of user.communities) {
      const membership = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = group.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "text-button danger-text";
      remove.dataset.removeMembership = user.id + "|" + group.groupId;
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + user.displayName + " from " + group.name);
      membership.append(label, remove);
      memberships.append(membership);
    }
    item.append(memberships);

    const actions = document.createElement("div");
    actions.className = "admin-user-actions";
    const activity = document.createElement("button");
    activity.type = "button";
    activity.className = "text-button";
    activity.dataset.userActivity = user.id;
    activity.textContent = "View study flow";
    const message = document.createElement("button");
    message.type = "button";
    message.className = "text-button";
    message.dataset.messageUser = user.id;
    message.textContent = "Message";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "text-button" + (user.suspended ? "" : " danger-text");
    toggle.dataset.toggleUser = user.id;
    toggle.textContent = user.suspended ? "Reactivate" : "Suspend";
    actions.append(activity, message, toggle);
    item.append(actions);
    if (!user.activityTrackingEnabled) {
      const note = document.createElement("small");
      note.className = "admin-user-optout";
      note.textContent = "Learner has turned off study activity tracking.";
      item.append(note);
    }
    userList.append(item);
  }
  if (!adminUsers.length) appendListItem(userList, "No platform accounts found", "Learner accounts are created through Community sign-up.");
  applyAdminSearch();
}

function renderCommunities() {
  communityList.replaceChildren();
  for (const community of adminCommunities) {
    const item = document.createElement("li");
    item.className = "admin-community-card";
    item.dataset.adminSearchable = (community.name + " " + community.summary + " " + community.members.map((member) => member.name + " " + member.email).join(" ")).toLocaleLowerCase();
    const form = document.createElement("form");
    form.className = "admin-community-edit";
    form.dataset.communityId = community.id;
    const nameLabel = document.createElement("label");
    nameLabel.className = "admin-field";
    nameLabel.textContent = "Community name";
    const nameInput = document.createElement("input");
    nameInput.name = "name";
    nameInput.maxLength = 100;
    nameInput.required = true;
    nameInput.value = community.name;
    nameLabel.append(nameInput);
    const summaryLabel = document.createElement("label");
    summaryLabel.className = "admin-field";
    summaryLabel.textContent = "Summary";
    const summaryInput = document.createElement("textarea");
    summaryInput.name = "summary";
    summaryInput.maxLength = 500;
    summaryInput.rows = 2;
    summaryInput.value = community.summary;
    summaryLabel.append(summaryInput);
    const activeLabel = document.createElement("label");
    activeLabel.className = "admin-community-active";
    const active = document.createElement("input");
    active.type = "checkbox";
    active.name = "active";
    active.checked = community.active;
    activeLabel.append(active, document.createTextNode("Available to join"));
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "button button-secondary";
    save.textContent = "Save community";
    form.append(nameLabel, summaryLabel, activeLabel, save);
    item.append(form);

    const members = document.createElement("details");
    members.className = "admin-community-members";
    const summary = document.createElement("summary");
    summary.textContent = community.members.length + (community.members.length === 1 ? " member" : " members");
    const memberList = document.createElement("ul");
    for (const member of community.members) {
      const row = document.createElement("li");
      const identity = document.createElement("span");
      identity.textContent = member.name + (member.email ? " · " + member.email : "");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "text-button danger-text";
      remove.dataset.removeMembership = member.userId + "|" + community.id;
      remove.textContent = "Remove";
      row.append(identity, remove);
      memberList.append(row);
    }
    if (!community.members.length) appendListItem(memberList, "No members yet", "");
    members.append(summary, memberList);
    item.append(members);
    communityList.append(item);
  }
  if (!adminCommunities.length) appendListItem(communityList, "No communities found", "Apply the community migrations to populate the ten groups.");

  requestList.replaceChildren();
  const pending = adminMembershipRequests.filter((request) => request.status === "pending");
  for (const request of pending) {
    const row = document.createElement("li");
    row.className = "admin-request-row";
    row.dataset.adminSearchable = (request.userName + " " + request.email + " " + request.groupName).toLocaleLowerCase();
    const description = document.createElement("span");
    description.textContent = request.userName + (request.email ? " (" + request.email + ")" : "") + " requested " + request.groupName;
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "text-button";
    approve.dataset.membershipRequest = request.id + "|approve";
    approve.textContent = "Approve";
    const decline = document.createElement("button");
    decline.type = "button";
    decline.className = "text-button danger-text";
    decline.dataset.membershipRequest = request.id + "|decline";
    decline.textContent = "Decline";
    row.append(description, approve, decline);
    requestList.append(row);
  }
  if (!pending.length) appendListItem(requestList, "No pending membership requests", "");
  applyAdminSearch();
}

function renderActivityEvents(events, list = activityList) {
  list.replaceChildren();
  for (const event of events) {
    const user = adminUsers.find((entry) => entry.id === event.user_id);
    appendListItem(
      list,
      (user?.displayName || "Learner") + " · " + event.event_type.replaceAll("_", " "),
      (event.title || event.item_id || event.page_path) + " · " + new Date(event.created_at).toLocaleString()
    );
  }
  if (!events.length) appendListItem(list, "No activity recorded", "The learner may have turned off activity tracking.");
  applyAdminSearch();
}

let adminMembershipRequests = [];
let adminSummary = null;

async function refreshDashboard() {
  if (dashboardRefreshInFlight) return;
  dashboardRefreshInFlight = true;
  const liveStatus = $("#admin-dashboard-live-status");
  liveStatus.dataset.state = "updating";
  liveStatus.textContent = "Updating dashboard…";
  try {
    const result = await adminRequest("/api/admin/dashboard");
    adminSummary = result;
    renderDashboard(result);
    $("#admin-dashboard-updated").textContent = "Last updated " + new Date().toLocaleTimeString() + " · auto-refreshes every 20 seconds while this dashboard is open.";
    liveStatus.dataset.state = "live";
    liveStatus.replaceChildren(
      Object.assign(document.createElement("span"), { className: "admin-live-dot", ariaHidden: "true" }),
      document.createTextNode("Live · next update in 20 seconds")
    );
  } catch (error) {
    liveStatus.dataset.state = "error";
    liveStatus.textContent = "Live update failed: " + error.message;
    throw error;
  } finally {
    dashboardRefreshInFlight = false;
  }
}

async function refreshUsers() {
  const result = await adminRequest("/api/admin/users");
  adminUsers = result.users;
  renderUsers();
  if (adminSummary) renderDashboard(adminSummary);
}

async function refreshCommunities() {
  const result = await adminRequest("/api/admin/communities");
  adminCommunities = result.groups;
  adminMembershipRequests = result.requests;
  renderCommunities();
}

async function refreshRemoteWorkspace() {
  try {
    await Promise.all([refreshUsers(), refreshCommunities(), refreshDashboard()]);
    consoleStatus.textContent = "Admin modules connected to the configured Supabase project.";
  } catch (error) {
    consoleStatus.textContent = error.message;
  }
}

function applyAdminSearch() {
  const query = adminSearch.value.trim().toLocaleLowerCase();
  document.querySelectorAll("[data-admin-searchable]").forEach((item) => {
    item.hidden = Boolean(query) && !item.dataset.adminSearchable.includes(query);
  });
}

function setAdminView(authenticated) {
  adminAuthenticated = authenticated;
  loginPanel.hidden = authenticated;
  workspace.hidden = !authenticated;
  logoutButton.hidden = !authenticated;
  if (dashboardPollTimer) window.clearInterval(dashboardPollTimer);
  dashboardPollTimer = undefined;
  if (authenticated) {
    materialsList.replaceChildren();
    addMaterial();
    refreshDepartments();
    refreshList();
    showAdminSection("dashboard");
    void refreshRemoteWorkspace();
    dashboardPollTimer = window.setInterval(refreshDashboardWhenVisible, 20_000);
  }
}

function refreshDashboardWhenVisible() {
  if (!adminAuthenticated || document.hidden || !document.querySelector('[data-admin-panel="dashboard"]:not([hidden])')) return;
  void refreshDashboard().catch((error) => { consoleStatus.textContent = "Dashboard auto-update failed: " + error.message; });
}

document.addEventListener("visibilitychange", refreshDashboardWhenVisible);
window.addEventListener("focus", refreshDashboardWhenVisible);

async function sessionIsValid() {
  try {
    const response = await fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) {
      setAdminView(false);
      loginStatus.textContent = "Your admin session has expired. Sign in again to continue.";
      return false;
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      status.textContent = result.error || "Could not verify the admin session.";
      return false;
    }
    return true;
  } catch {
    status.textContent = "Admin verification needs a connection to the app server.";
    return false;
  }
}

async function initializeAdmin() {
  try {
    const response = await fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" });
    if (response.ok) {
      loginStatus.textContent = "";
      setAdminView(true);
      return;
    }
    setAdminView(false);
    if (response.status !== 401) {
      const result = await response.json().catch(() => ({}));
      loginStatus.textContent = result.error || "Admin sign-in is not available. Check the server configuration.";
    }
  } catch {
    setAdminView(false);
    loginStatus.textContent = "Connect to the app server to sign in.";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginStatus.textContent = "Checking sign-in…";
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: $("#admin-username").value,
        password: $("#admin-password").value
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      loginStatus.textContent = result.error || "Sign-in failed.";
      return;
    }
    $("#admin-password").value = "";
    loginStatus.textContent = "";
    setAdminView(true);
  } catch {
    loginStatus.textContent = "Could not reach the sign-in service. Check your connection and try again.";
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin", cache: "no-store" });
  } finally {
    $("#admin-password").value = "";
    loginStatus.textContent = "You have signed out.";
    setAdminView(false);
    logoutButton.disabled = false;
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function makeId() {
  const random = globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  return "local-" + random.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 72);
}

function createMaterialRow(material = {}) {
  const row = materialTemplate.content.firstElementChild.cloneNode(true);
  for (const field of row.querySelectorAll("[data-field]")) {
    if (material[field.dataset.field] !== undefined) field.value = material[field.dataset.field];
  }
  return row;
}

function addMaterial(material) {
  materialsList.append(createMaterialRow(material));
}

function refreshList() {
  const courses = getLocalCourses();
  $("#local-course-count").textContent = String(courses.length);
  const list = $("#local-course-list");
  if (!courses.length) {
    list.innerHTML = '<li class="admin-empty-row">No local courses yet. Add one above to see it in the Learning Hub.</li>';
    return;
  }
  list.innerHTML = courses.map((course) => '<li class="admin-course-row"><div><strong>' + escapeHtml(course.title) + '</strong><span>' + escapeHtml(course.department) + ' · ' + escapeHtml(course.level) + '</span><small>' + course.materials.length + (course.materials.length === 1 ? ' material' : ' materials') + '</small></div><div class="admin-row-actions"><button type="button" class="text-button" data-edit-course="' + escapeHtml(course.id) + '">Edit</button><button type="button" class="text-button danger-text" data-delete-course="' + escapeHtml(course.id) + '">Delete</button></div></li>').join("");
}

function refreshDepartments() {
  const departments = [...new Set([...COURSES, ...PROGRAMMES].map((course) => course.department))].sort((a, b) => a.localeCompare(b));
  $("#department-options").innerHTML = departments.map((department) => '<option value="' + escapeHtml(department) + '"></option>').join("");
}

function resetEditor() {
  form.reset();
  $("#course-id").value = "";
  materialsList.replaceChildren();
  addMaterial();
  editingId = "";
  $("#admin-form-title").textContent = "Add a course";
  $("#save-course-button").textContent = "Save course";
  $("#cancel-edit").hidden = true;
}

function fillEditor(course) {
  editingId = course.id;
  $("#course-id").value = course.id;
  for (const field of form.querySelectorAll("[name]")) {
    if (field.name !== "id" && course[field.name] !== undefined) field.value = course[field.name];
  }
  materialsList.replaceChildren();
  for (const material of course.materials) addMaterial(material);
  if (!course.materials.length) addMaterial();
  $("#admin-form-title").textContent = "Edit course";
  $("#save-course-button").textContent = "Update course";
  $("#cancel-edit").hidden = false;
  status.textContent = "Editing “" + course.title + "”. Changes remain on this browser.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function collectCourse() {
  const data = new FormData(form);
  const materialRows = [...materialsList.querySelectorAll("[data-material-row]")];
  const materials = materialRows.map((row, index) => {
    const value = (name) => row.querySelector('[data-field="' + name + '"]')?.value.trim() || "";
    return {
      id: value("id") || "material-" + (index + 1) + "-" + Math.random().toString(36).slice(2, 8),
      title: value("title"),
      section: value("section") || "Course materials",
      type: value("type"),
      source: value("source"),
      href: value("href"),
      duration: value("duration") || "Self-paced",
      detail: value("detail"),
      sourceLicense: value("sourceLicense") || "Terms not specified · check the source",
      sourceCheckedAt: value("sourceCheckedAt"),
      access: value("access") || "External link · connection required"
    };
  }).filter((material) => material.title || material.href || material.detail);

  return {
    id: editingId || makeId(),
    title: String(data.get("title") || "").trim(),
    code: String(data.get("code") || "").trim(),
    institution: String(data.get("institution") || "").trim(),
    department: String(data.get("department") || "").trim(),
    qualification: String(data.get("qualification") || "Skills pathway").trim(),
    level: String(data.get("level") || "").trim() || String(data.get("qualification") || "Self-paced"),
    category: String(data.get("category") || "Course").trim(),
    format: String(data.get("format") || "").trim() || "Source-linked materials",
    description: String(data.get("description") || "").trim(),
    materials
  };
}

async function downloadExport() {
  if (!await sessionIsValid()) return;
  const blob = new Blob([exportLocalCatalog()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cachecourse-catalog.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  status.textContent = "Catalog backup downloaded. Store the JSON file somewhere you can find it.";
}

async function loadImport(file) {
  if (!file) return;
  if (!await sessionIsValid()) return;
  file.text().then(async (text) => {
    if (!await sessionIsValid()) return;
    const result = importLocalCatalog(JSON.parse(text));
    refreshList();
    status.textContent = result.accepted + " course records imported or updated. The local catalogue now has " + result.total + " courses.";
  }).catch((error) => {
    status.textContent = error.message || "Could not import that JSON file.";
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!await sessionIsValid()) return;
  try {
    const course = collectCourse();
    if (!course.materials.length) throw new Error("Add at least one material with a title and source URL.");
    const saved = saveLocalCourse(course);
    refreshList();
    status.textContent = (editingId ? "Updated “" : "Saved “") + saved.title + "” to this browser. It now appears in the Learning Hub.";
    resetEditor();
  } catch (error) {
    status.textContent = error.message || "Could not save this course in the browser.";
  }
});

materialsList.addEventListener("click", async (event) => {
  const remove = event.target.closest(".admin-remove-material");
  if (!remove) return;
  if (!await sessionIsValid()) return;
  const row = remove.closest("[data-material-row]");
  if (materialsList.querySelectorAll("[data-material-row]").length === 1) {
    row.querySelectorAll("input, textarea").forEach((field) => { field.value = ""; });
    row.querySelector("select").selectedIndex = 0;
  } else row.remove();
});

$("#add-material").addEventListener("click", async () => {
  if (!await sessionIsValid()) return;
  addMaterial();
  materialsList.lastElementChild.querySelector("input").focus();
});

$("#local-course-list").addEventListener("click", async (event) => {
  if (!await sessionIsValid()) return;
  const editButton = event.target.closest("[data-edit-course]");
  const deleteButton = event.target.closest("[data-delete-course]");
  if (editButton) {
    const course = getLocalCourses().find((entry) => entry.id === editButton.dataset.editCourse);
    if (course) fillEditor(course);
  } else if (deleteButton) {
    const course = getLocalCourses().find((entry) => entry.id === deleteButton.dataset.deleteCourse);
    if (course && window.confirm("Delete “" + course.title + "” from this browser’s local catalogue?")) {
      deleteLocalCourse(course.id);
      refreshList();
      status.textContent = "Deleted “" + course.title + "” from this browser.";
      if (editingId === course.id) resetEditor();
    }
  }
});

$("#cancel-edit").addEventListener("click", resetEditor);
$("#clear-form").addEventListener("click", resetEditor);
$("#export-catalog").addEventListener("click", downloadExport);
$("#import-catalog").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", (event) => {
  loadImport(event.target.files?.[0]);
  event.target.value = "";
});

document.querySelector(".admin-sidebar-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-section]");
  if (!button) return;
  showAdminSection(button.dataset.adminSection);
  if (button.dataset.adminSection === "dashboard") void refreshDashboard().catch((error) => { consoleStatus.textContent = error.message; });
  if (button.dataset.adminSection === "users") void refreshUsers().catch((error) => { $("#admin-users-message").textContent = error.message; });
  if (button.dataset.adminSection === "communities") void refreshCommunities().catch((error) => { $("#admin-communities-title").textContent = "Could not load communities: " + error.message; });
  if (button.dataset.adminSection === "messages" && messageUserSelect.value) void loadAdminConversation(messageUserSelect.value);
});

adminSearch.addEventListener("input", applyAdminSearch);
$("#admin-dashboard-refresh").addEventListener("click", () => {
  void refreshDashboard().catch((error) => { consoleStatus.textContent = error.message; });
});
$("#admin-users-refresh").addEventListener("click", () => {
  void refreshUsers().catch((error) => { $("#admin-users-message").textContent = error.message; });
});
$("#admin-communities-refresh").addEventListener("click", () => {
  void refreshCommunities().catch((error) => { $("#admin-communities-title").textContent = "Could not load communities: " + error.message; });
});
$("#admin-activity-refresh").addEventListener("click", async () => {
  try {
    const result = await adminRequest("/api/admin/dashboard");
    renderActivityEvents(result.recentEvents || []);
    $("#admin-activity-message").textContent = "Showing the latest recorded learner activity.";
  } catch (error) {
    $("#admin-activity-message").textContent = error.message;
  }
});

userList.addEventListener("submit", async (event) => {
  const edit = event.target.closest(".admin-user-edit");
  if (!edit) return;
  event.preventDefault();
  const value = new FormData(edit).get("displayName");
  const button = edit.querySelector("button");
  button.disabled = true;
  try {
    await adminRequest("/api/admin/users/" + encodeURIComponent(edit.dataset.userId), {
      method: "PATCH",
      body: JSON.stringify({ displayName: String(value).trim() })
    });
    $("#admin-users-message").textContent = "User profile updated.";
    await refreshUsers();
  } catch (error) {
    $("#admin-users-message").textContent = "Could not update user: " + error.message;
  } finally {
    button.disabled = false;
  }
});

userList.addEventListener("click", async (event) => {
  const activityButton = event.target.closest("[data-user-activity]");
  const messageButton = event.target.closest("[data-message-user]");
  const toggleButton = event.target.closest("[data-toggle-user]");
  const removeButton = event.target.closest("[data-remove-membership]");
  if (activityButton) {
    const user = adminUsers.find((entry) => entry.id === activityButton.dataset.userActivity);
    try {
      const { events } = await adminRequest("/api/admin/activity?userId=" + encodeURIComponent(activityButton.dataset.userActivity));
      showAdminSection("activity");
      $("#admin-activity-title").textContent = "Study flow · " + (user?.displayName || "Learner");
      $("#admin-activity-message").textContent = user?.activityTrackingEnabled
        ? "Individual study activity is recorded while tracking is enabled."
        : "This learner opted out; this history reflects activity recorded before they turned it off.";
      renderActivityEvents(events);
    } catch (error) {
      $("#admin-users-message").textContent = "Could not load learner activity: " + error.message;
    }
    return;
  }
  if (messageButton) {
    showAdminSection("messages");
    messageUserSelect.value = messageButton.dataset.messageUser;
    await loadAdminConversation(messageUserSelect.value);
    return;
  }
  if (toggleButton) {
    const user = adminUsers.find((entry) => entry.id === toggleButton.dataset.toggleUser);
    const suspended = !user?.suspended;
    if (!window.confirm((suspended ? "Suspend " : "Reactivate ") + (user?.email || "this account") + "?")) return;
    toggleButton.disabled = true;
    try {
      await adminRequest("/api/admin/users/" + encodeURIComponent(toggleButton.dataset.toggleUser), {
        method: "PATCH",
        body: JSON.stringify({ suspended })
      });
      $("#admin-users-message").textContent = suspended ? "Account suspended." : "Account reactivated.";
      await refreshUsers();
    } catch (error) {
      $("#admin-users-message").textContent = "Could not change account status: " + error.message;
    } finally {
      toggleButton.disabled = false;
    }
    return;
  }
  if (removeButton) {
    const [userId, groupId] = removeButton.dataset.removeMembership.split("|");
    if (!window.confirm("Remove this learner from the community?")) return;
    removeButton.disabled = true;
    try {
      await adminRequest("/api/admin/memberships?userId=" + encodeURIComponent(userId) + "&groupId=" + encodeURIComponent(groupId), { method: "DELETE" });
      await Promise.all([refreshUsers(), refreshCommunities()]);
      $("#admin-users-message").textContent = "Community membership removed.";
    } catch (error) {
      $("#admin-users-message").textContent = "Could not remove membership: " + error.message;
    } finally {
      removeButton.disabled = false;
    }
  }
});

communityList.addEventListener("submit", async (event) => {
  const edit = event.target.closest(".admin-community-edit");
  if (!edit) return;
  event.preventDefault();
  const data = new FormData(edit);
  const button = edit.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    await adminRequest("/api/admin/communities/" + encodeURIComponent(edit.dataset.communityId), {
      method: "PATCH",
      body: JSON.stringify({
        name: String(data.get("name")).trim(),
        summary: String(data.get("summary")).trim(),
        active: data.get("active") === "on"
      })
    });
    await refreshCommunities();
    consoleStatus.textContent = "Community details saved.";
  } catch (error) {
    consoleStatus.textContent = "Could not save community: " + error.message;
  } finally {
    button.disabled = false;
  }
});

communityList.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-membership]");
  if (!removeButton) return;
  const [userId, groupId] = removeButton.dataset.removeMembership.split("|");
  if (!window.confirm("Remove this learner from the community?")) return;
  removeButton.disabled = true;
  try {
    await adminRequest("/api/admin/memberships?userId=" + encodeURIComponent(userId) + "&groupId=" + encodeURIComponent(groupId), { method: "DELETE" });
    await Promise.all([refreshUsers(), refreshCommunities()]);
    consoleStatus.textContent = "Community membership removed.";
  } catch (error) {
    consoleStatus.textContent = "Could not remove membership: " + error.message;
  } finally {
    removeButton.disabled = false;
  }
});

requestList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-membership-request]");
  if (!button) return;
  const [requestId, action] = button.dataset.membershipRequest.split("|");
  button.disabled = true;
  try {
    await adminRequest("/api/admin/membership-requests/" + encodeURIComponent(requestId), {
      method: "POST",
      body: JSON.stringify({ action })
    });
    await Promise.all([refreshCommunities(), refreshUsers()]);
    consoleStatus.textContent = "Membership request " + (action === "approve" ? "approved." : "declined.");
  } catch (error) {
    consoleStatus.textContent = "Could not review membership request: " + error.message;
  } finally {
    button.disabled = false;
  }
});

async function loadAdminConversation(userId) {
  messageHistory.replaceChildren();
  if (!userId) return;
  try {
    const { messages } = await adminRequest("/api/admin/messages?userId=" + encodeURIComponent(userId));
    for (const message of messages.slice().reverse()) {
      const item = document.createElement("li");
      item.dataset.adminSearchable = (message.sender_is_admin ? "admin " : "learner ") + message.body.toLocaleLowerCase();
      const heading = document.createElement("strong");
      heading.textContent = message.sender_is_admin ? "CacheCourse Admin" : "Learner";
      const body = document.createElement("p");
      body.textContent = message.body;
      const time = document.createElement("time");
      time.dateTime = message.created_at;
      time.textContent = new Date(message.created_at).toLocaleString();
      item.append(heading, body, time);
      messageHistory.append(item);
    }
  } catch (error) {
    $("#admin-message-status").textContent = "Could not load conversation: " + error.message;
  }
}

messageUserSelect.addEventListener("change", () => { void loadAdminConversation(messageUserSelect.value); });
$("#admin-message-refresh").addEventListener("click", () => { void loadAdminConversation(messageUserSelect.value); });
$("#admin-message-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const userId = messageUserSelect.value;
  const message = $("#admin-message-text").value.trim();
  if (!userId || !message) return;
  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    await adminRequest("/api/admin/messages", {
      method: "POST",
      body: JSON.stringify({ userId, body: message })
    });
    $("#admin-message-text").value = "";
    $("#admin-message-status").textContent = "Private message sent.";
    await loadAdminConversation(userId);
  } catch (error) {
    $("#admin-message-status").textContent = "Could not send message: " + error.message;
  } finally {
    button.disabled = false;
  }
});

initializeAdmin();
