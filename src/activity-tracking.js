import { COMMUNITY_CHAT_CONFIG, loadCommunityChatConfig } from "./community-chat-config.js";
import { getSupabaseClient } from "./supabase-client.js";

let supabase;
let currentUser;
let trackingEnabled = false;
let pageTrackedForUserId;
let notice;
let noticeText;
let trackingButton;
let deleteButton;
let reopenButton;

function showStatus(message) {
  if (noticeText) noticeText.textContent = message;
}

function renderNotice() {
  if (!currentUser || !notice) return;
  notice.hidden = false;
  reopenButton.hidden = true;
  noticeText.textContent = trackingEnabled
    ? "For signed-in learners, CacheCourse records page visits, course views, and completed lessons for study-flow support. Visit totals are anonymous aggregates; CacheCourse activity records do not include an IP address or visitor ID. The global admin can view account activity. Activity is kept until deleted. You can turn tracking off or erase your activity here."
    : "Study activity tracking is off. Anonymous aggregate page-visit totals may still be counted. Existing study activity remains until you erase it.";
  trackingButton.textContent = trackingEnabled ? "Turn tracking off" : "Turn tracking on";
  deleteButton.hidden = false;
}

async function saveTrackingSetting(enabled) {
  const { error } = await supabase
    .from("community_profiles")
    .update({ activity_tracking_enabled: enabled })
    .eq("id", currentUser.id);
  if (error) throw error;
  trackingEnabled = enabled;
  renderNotice();
}

function mountNotice() {
  notice = document.createElement("aside");
  notice.className = "activity-privacy-notice";
  notice.hidden = true;
  notice.setAttribute("aria-label", "Learning activity privacy settings");
  noticeText = document.createElement("p");
  noticeText.setAttribute("role", "status");
  noticeText.setAttribute("aria-live", "polite");
  const actions = document.createElement("div");
  actions.className = "activity-privacy-actions";
  trackingButton = document.createElement("button");
  trackingButton.type = "button";
  trackingButton.addEventListener("click", async () => {
    trackingButton.disabled = true;
    try {
      await saveTrackingSetting(!trackingEnabled);
      showStatus(trackingEnabled ? "Study activity tracking is on." : "Study activity tracking is off.");
      if (trackingEnabled) await trackLearnerActivity("page_view", null, document.title);
    } catch (error) {
      showStatus("Could not save your tracking preference: " + error.message);
    } finally {
      trackingButton.disabled = false;
    }
  });
  deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Erase my activity";
  deleteButton.addEventListener("click", async () => {
    if (!window.confirm("Erase all study-flow activity saved for your account? This cannot be undone.")) return;
    deleteButton.disabled = true;
    try {
      const { error } = await supabase.from("activity_events").delete().eq("user_id", currentUser.id);
      if (error) throw error;
      showStatus("Your recorded study activity was erased.");
    } catch (error) {
      showStatus("Could not erase your activity: " + error.message);
    } finally {
      deleteButton.disabled = false;
    }
  });
  const close = document.createElement("button");
  close.type = "button";
  close.className = "activity-privacy-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Dismiss activity privacy notice");
  close.addEventListener("click", () => {
    notice.hidden = true;
    reopenButton.hidden = false;
  });
  actions.append(trackingButton, deleteButton, close);
  notice.append(noticeText, actions);
  reopenButton = document.createElement("button");
  reopenButton.type = "button";
  reopenButton.className = "activity-privacy-reopen";
  reopenButton.textContent = "Privacy settings";
  reopenButton.hidden = true;
  reopenButton.addEventListener("click", () => {
    notice.hidden = false;
    reopenButton.hidden = true;
  });
  document.body.append(notice);
  document.body.append(reopenButton);
}

async function recordAnonymousVisit(client) {
  const path = location.pathname === "/index.html" ? "/" : location.pathname;
  const key = "cachecourse-visit:" + path + ":" + new Date().toISOString().slice(0, 10);
  try {
    if (sessionStorage.getItem(key)) return;
    const { error } = await client.rpc("record_platform_visit", { requested_page_path: path });
    if (error) throw error;
    sessionStorage.setItem(key, "recorded");
  } catch (error) {
    if (currentUser) showStatus("Anonymous visit totals are unavailable: " + error.message);
  }
}

export async function trackLearnerActivity(eventType, itemId = null, title = null) {
  if (!["page_view", "course_view", "lesson_complete"].includes(eventType)) {
    throw new Error("Unsupported learning activity type.");
  }
  if (!supabase) return;
  if (!currentUser) await syncSession();
  if (!currentUser || !trackingEnabled) return;
  const event = {
    user_id: currentUser.id,
    event_type: eventType,
    page_path: location.pathname,
    item_id: itemId,
    title
  };
  const { error } = await supabase.from("activity_events").insert(event);
  if (error) showStatus("Could not record study activity: " + error.message);
}

async function syncSession() {
  if (!supabase) return;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showStatus("Could not verify your learning account: " + error.message);
    return;
  }
  const user = data.session?.user;
  if (!user) {
    currentUser = undefined;
    trackingEnabled = false;
    if (notice) notice.hidden = true;
    if (reopenButton) reopenButton.hidden = true;
    return;
  }
  currentUser = user;
  const { data: profile, error: profileError } = await supabase
    .from("community_profiles")
    .select("activity_tracking_enabled")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    notice.hidden = false;
    showStatus("Activity privacy settings could not be loaded: " + profileError.message);
    return;
  }
  trackingEnabled = profile?.activity_tracking_enabled !== false;
  renderNotice();
  if (trackingEnabled) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (pageTrackedForUserId !== user.id) {
      pageTrackedForUserId = user.id;
      await trackLearnerActivity("page_view", null, document.title);
    }
  }
}

async function initialize() {
  mountNotice();
  if (!navigator.onLine) return;
  try {
    await loadCommunityChatConfig();
    if (!COMMUNITY_CHAT_CONFIG.supabaseUrl || !COMMUNITY_CHAT_CONFIG.publishableKey) return;
    supabase = await getSupabaseClient();
    if (!supabase) return;
    void recordAnonymousVisit(supabase);
    supabase.auth.onAuthStateChange(() => { window.setTimeout(() => { void syncSession(); }, 0); });
    window.addEventListener("cachecourse:auth-changed", () => { void syncSession(); });
    await syncSession();
  } catch (error) {
    if (currentUser && notice) notice.hidden = false;
    showStatus("Activity privacy settings could not be loaded: " + error.message);
  }
}

void initialize();
