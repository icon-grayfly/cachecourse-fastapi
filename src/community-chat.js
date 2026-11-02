import { COMMUNITY_SECTORS } from "./community-sectors.js";
import { COMMUNITY_CHAT_CONFIG, loadCommunityChatConfig } from "./community-chat-config.js";
import { getSupabaseClient } from "./supabase-client.js";
import { getAllCourses } from "./catalog-store.js";
import { loadLearningState, setFavoriteReminderCadence, toggleCourseFavorite } from "./favorites.js";

const ui = {
  status: document.querySelector("#community-chat-status"),
  setup: document.querySelector("#community-chat-setup"),
  loginButton: document.querySelector("#community-login-button"),
  signupButton: document.querySelector("#community-signup-button"),
  accountButton: document.querySelector("#community-account-button"),
  accountDialog: document.querySelector("#community-account-dialog"),
  accountClose: document.querySelector("#community-account-close"),
  accountStatus: document.querySelector("#community-account-status"),
  profileStatus: document.querySelector("#community-profile-status"),
  accountProfile: document.querySelector("#community-account-profile"),
  accountDisplayName: document.querySelector("#community-account-display-name"),
  accountEmail: document.querySelector("#community-account-email"),
  accountMembership: document.querySelector("#community-account-membership"),
  profileInbox: document.querySelector("#community-profile-inbox"),
  accountCloseProfile: document.querySelector("#community-account-close-profile"),
  profileFavouritesList: document.querySelector("#community-profile-favourites-list"),
  reminderCadence: document.querySelector("#community-favourite-reminder"),
  auth: document.querySelector("#community-chat-auth"),
  authTitle: document.querySelector("#community-account-title"),
  displayNameLabel: document.querySelector("#community-display-name-label"),
  authForm: document.querySelector("#community-chat-auth-form"),
  authSubmit: document.querySelector("#community-auth-submit"),
  authSwitch: document.querySelector("#community-auth-switch"),
  forgotPassword: document.querySelector("#community-forgot-password"),
  displayName: document.querySelector("#community-chat-display-name"),
  passwordLabel: document.querySelector("#community-password-label"),
  email: document.querySelector("#community-chat-email"),
  password: document.querySelector("#community-chat-password"),
  grid: document.querySelector("#community-sector-grid"),
  groupView: document.querySelector("#community-sector-view"),
  back: document.querySelector("#community-sector-back"),
  groupKicker: document.querySelector("#community-sector-kicker"),
  groupTitle: document.querySelector("#community-sector-title"),
  groupDescription: document.querySelector("#community-sector-description"),
  workspace: document.querySelector("#community-sector-workspace"),
  modules: [...document.querySelectorAll("[data-community-module]")],
  modulePanels: [...document.querySelectorAll("[data-community-panel]")],
  moduleOverviewTitle: document.querySelector("#community-module-overview-title"),
  moduleOverviewDescription: document.querySelector("#community-module-overview-description"),
  moduleOpenMessages: document.querySelector("#community-module-open-messages"),
  joinPanel: document.querySelector("#community-sector-join"),
  membershipNote: document.querySelector("#community-sector-membership-note"),
  join: document.querySelector("#community-sector-join-button"),
  memberList: document.querySelector("#community-member-list"),
  room: document.querySelector("#community-chat-room"),
  onlineCount: document.querySelector("#community-chat-online-count"),
  leaveGroup: document.querySelector("#community-chat-leave-group"),
  signOut: document.querySelector("#community-chat-signout"),
  messages: document.querySelector("#community-chat-messages"),
  compose: document.querySelector("#community-chat-compose"),
  message: document.querySelector("#community-chat-message"),
  inbox: document.querySelector("#community-chat-inbox"),
  directMessageDialog: document.querySelector("#community-direct-message-dialog"),
  directMessageClose: document.querySelector("#community-direct-message-close"),
  directMessagePeer: document.querySelector("#community-direct-message-peer"),
  directMessageStatus: document.querySelector("#community-direct-message-status"),
  directMessageThreads: document.querySelector("#community-direct-message-threads"),
  directMessageHistory: document.querySelector("#community-direct-message-history"),
  directMessageForm: document.querySelector("#community-direct-message-form"),
  directMessageBody: document.querySelector("#community-direct-message-body"),
  profileAvatar: document.querySelector("#community-profile-avatar"),
  profileAvatarFallback: document.querySelector("#community-profile-avatar-fallback"),
  profileAvatarFile: document.querySelector("#community-profile-avatar-file"),
  profileAvatarRemove: document.querySelector("#community-profile-avatar-remove"),
  reportDialog: document.querySelector("#community-report-dialog"),
  reportForm: document.querySelector("#community-report-form"),
  reportReason: document.querySelector("#community-report-reason"),
  manageBlocks: document.querySelector("#community-chat-manage-blocks"),
  blocksDialog: document.querySelector("#community-blocks-dialog"),
  blocksList: document.querySelector("#community-blocks-list"),
  blocksClose: document.querySelector("#community-blocks-close")
};

const maxMessages = 60;
let communitySectors = COMMUNITY_SECTORS.map((sector) => ({ ...sector, configured: false, active: false }));
let supabase;
let currentUser;
let memberships = [];
let membershipRequests = [];
let activeSector;
let chatChannel;
let directMessageChannel;
let isModerator = false;
let blockedUserIds = new Set();
let reportingMessageId;
let authMode = "signin";
let profileAvatarPath;
let directMessagePeerId;
let directMessageGroupId;
let directMessageProfiles = new Map();
let activeCommunityModule = "overview";
let activeCommunityId;
const avatarUrlCache = new Map();

function setStatus(message, state = "info") {
  ui.status.textContent = message;
  ui.status.dataset.state = state;
}

function updateAccountView() {
  const signedIn = Boolean(currentUser);
  const displayName = currentUser?.user_metadata?.display_name || "Learner";
  ui.loginButton.hidden = !supabase || signedIn;
  ui.signupButton.hidden = !supabase || signedIn;
  ui.accountButton.hidden = !supabase || !signedIn;
  ui.auth.hidden = signedIn || !supabase;
  ui.accountProfile.hidden = !signedIn;
  ui.accountDisplayName.textContent = displayName;
  ui.accountEmail.textContent = currentUser?.email || "";
  ui.accountMembership.textContent = memberships.length
    ? "Your communities: " + memberships.map((group) => group.name).join(", ") + "."
    : "You have not joined a sector group yet.";
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === "signup";
  const recovering = mode === "recovery";
  const resetting = mode === "forgot";
  ui.authTitle.textContent = signingUp ? "Create your account"
    : recovering ? "Choose a new password"
      : resetting ? "Reset your password" : "Log in to your account";
  ui.displayNameLabel.hidden = !signingUp;
  ui.displayName.required = signingUp;
  ui.passwordLabel.hidden = resetting;
  ui.password.required = !resetting;
  ui.passwordLabel.firstChild.textContent = recovering ? "New password" : "Password";
  ui.password.autocomplete = signingUp || recovering ? "new-password" : "current-password";
  ui.authSubmit.value = signingUp ? "signup" : resetting ? "reset" : recovering ? "update" : "signin";
  ui.authSubmit.textContent = signingUp ? "Sign Up"
    : resetting ? "Send reset link" : recovering ? "Save new password" : "Log in";
  ui.authSwitch.textContent = signingUp ? "Already have an account? Log in"
    : mode === "signin" ? "New here? Sign Up" : "Back to log in";
  ui.forgotPassword.hidden = mode !== "signin";
  ui.accountStatus.textContent = "";
}

async function getAvatarUrl(path) {
  const cached = avatarUrlCache.get(path);
  if (cached?.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabase.storage
    .from("community-avatars")
    .createSignedUrl(path, 300);
  if (error) throw error;
  const entry = { url: data.signedUrl, expiresAt: Date.now() + 240_000 };
  avatarUrlCache.set(path, entry);
  return entry.url;
}

async function renderProfileAvatar() {
  if (!currentUser) return;
  const { data, error } = await supabase
    .from("community_profiles")
    .select("avatar_path")
    .eq("id", currentUser.id)
    .single();
  if (error) throw error;
  profileAvatarPath = data.avatar_path;
  const displayName = currentUser.user_metadata?.display_name || "Learner";
  ui.profileAvatarFallback.textContent = displayName
    .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "CC";
  ui.profileAvatarRemove.hidden = !profileAvatarPath;
  if (!profileAvatarPath) {
    ui.profileAvatar.removeAttribute("src");
    ui.profileAvatar.hidden = true;
    ui.profileAvatarFallback.hidden = false;
    return;
  }
  try {
    ui.profileAvatar.src = await getAvatarUrl(profileAvatarPath);
    ui.profileAvatar.hidden = false;
    ui.profileAvatarFallback.hidden = true;
  } catch (error) {
    ui.profileAvatar.hidden = true;
    ui.profileAvatarFallback.hidden = false;
    throw error;
  }
}

async function renderProfileFavourites() {
  const state = await loadLearningState();
  const courses = new Map(getAllCourses().map((course) => [course.id, course]));
  ui.reminderCadence.value = state.favoriteReminderCadence;
  ui.profileFavouritesList.replaceChildren();
  const favourites = state.favorites.map((id) => ({ id, course: courses.get(id) }));
  if (!favourites.length) {
    const empty = document.createElement("li");
    empty.className = "community-profile-favourites-empty";
    empty.textContent = "Your wishlist is empty. Save a course from the Learning Hub to build your plan.";
    ui.profileFavouritesList.append(empty);
    return;
  }
  for (const { id, course } of favourites) {
    const item = document.createElement("li");
    const title = course ? document.createElement("a") : document.createElement("span");
    if (course) {
      title.href = "/course.html?course=" + encodeURIComponent(course.id) + "#course-workspace";
      title.textContent = course.title;
    } else {
      title.textContent = "Course no longer in this catalogue";
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "community-profile-favourite-remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove " + (course?.title || "unavailable course") + " from your wishlist");
    remove.addEventListener("click", async () => {
      try {
        await toggleCourseFavorite(id);
        await renderProfileFavourites();
        ui.profileStatus.textContent = (course?.title || "Course") + " removed from your learning wishlist.";
      } catch (error) {
        ui.profileStatus.textContent = error.message;
      }
    });
    item.append(link, remove);
    ui.profileFavouritesList.append(item);
  }
}

async function openAccountDialog(mode = "profile") {
  if (!supabase) return;
  ui.accountStatus.textContent = "";
  ui.profileStatus.textContent = "";
  updateAccountView();
  if (!currentUser) setAuthMode(mode);
  ui.accountDialog.showModal();
  if (currentUser) {
    try {
      await Promise.all([renderProfileFavourites(), renderProfileAvatar()]);
    } catch (error) {
      ui.profileStatus.textContent = "Could not load your profile details: " + error.message;
    }
  } else {
    ui.email.focus();
  }
}

function selectedSectorFromHash() {
  const match = window.location.hash.match(/^#sector\/([a-z0-9-]+)$/);
  return match ? communitySectors.find((sector) => sector.id === match[1]) : undefined;
}

function renderSectorCards() {
  const cards = communitySectors.map((sector) => {
    const card = document.createElement("article");
    card.className = "community-sector-card";
    const icon = document.createElement("span");
    icon.className = "community-sector-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = sector.icon;
    const kicker = document.createElement("span");
    kicker.className = "community-sector-card-kicker";
    kicker.textContent = "CAREER COMMUNITY";
    const title = document.createElement("h3");
    title.textContent = sector.name;
    const description = document.createElement("p");
    description.textContent = sector.summary;
    const action = document.createElement("button");
    action.type = "button";
    action.className = "community-sector-open";
    action.textContent = "Join Group";
    action.disabled = !sector.active;
    if (!sector.active) {
      action.title = "This group is not yet available. Check the Supabase sector-group setup.";
      action.setAttribute("aria-label", "Join Group: " + sector.name + " (not yet available)");
    }
    action.addEventListener("click", () => {
      if (!sector.active) return;
      window.location.hash = "sector/" + sector.id;
    });
    card.append(icon, kicker, title, description, action);
    return card;
  });
  ui.grid.replaceChildren(...cards);
}

function renderSignedOut() {
  currentUser = undefined;
  window.dispatchEvent(new Event("cachecourse:auth-changed"));
  void removeDirectMessageChannel();
  if (ui.directMessageDialog.open) ui.directMessageDialog.close();
  memberships = [];
  membershipRequests = [];
  activeSector = undefined;
  isModerator = false;
  blockedUserIds = new Set();
  ui.room.hidden = true;
  ui.groupView.hidden = true;
  ui.workspace.hidden = true;
  ui.grid.hidden = false;
  ui.messages.replaceChildren();
  ui.memberList.replaceChildren();
  ui.directMessageThreads.replaceChildren();
  ui.directMessageHistory.replaceChildren();
  ui.onlineCount.textContent = "0 learners online";
  updateAccountView();
  renderSectorRoute();
}

async function removeChannel() {
  if (!chatChannel) return;
  const channel = chatChannel;
  chatChannel = undefined;
  const result = await supabase.removeChannel(channel);
  if (result !== "ok") setStatus("Could not close the sector conversation: " + result, "error");
}

async function removeDirectMessageChannel() {
  if (!directMessageChannel) return;
  const channel = directMessageChannel;
  directMessageChannel = undefined;
  const result = await supabase.removeChannel(channel);
  if (result !== "ok") setStatus("Could not close the private message connection: " + result, "error");
}

async function startDirectMessageFeed() {
  if (!currentUser || directMessageChannel) return;
  directMessageChannel = supabase.channel("dm-" + currentUser.id, {
    config: { private: true }
  }).on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "community_direct_messages"
  }, () => {
    if (!ui.directMessageDialog.open) return;
    void loadDirectMessageThreads().then(renderDirectMessageHistory).catch((error) => {
      ui.directMessageStatus.textContent = "Could not refresh direct messages: " + error.message;
    });
  }).subscribe((status, error) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      ui.directMessageStatus.textContent = "Private message updates are unavailable: " + (error?.message || status);
    }
  });
}

async function loadMembership() {
  const { data, error } = await supabase
    .from("community_memberships")
    .select("group_id,community_groups!community_memberships_group_id_fkey(id,name,summary)")
    .eq("user_id", currentUser.id)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  memberships = data.map((entry) => entry.community_groups).filter(Boolean);
  const { data: requests, error: requestError } = await supabase
    .from("community_membership_requests")
    .select("group_id,status")
    .eq("user_id", currentUser.id)
    .eq("status", "pending");
  if (requestError) throw requestError;
  membershipRequests = requests;
}

function isMemberOf(groupId) {
  return memberships.some((group) => group.id === groupId);
}

function hasPendingMembershipRequest(groupId) {
  return membershipRequests.some((request) => request.group_id === groupId);
}

async function loadGroupMembers(groupId) {
  if (!currentUser || !isMemberOf(groupId)) {
    ui.memberList.replaceChildren();
    return;
  }
  const { data, error } = await supabase
    .from("community_memberships")
    .select("user_id,joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  const memberIds = data.map((member) => member.user_id);
  const { data: profiles, error: profileError } = await supabase
    .from("community_profiles")
    .select("id,display_name,avatar_path")
    .in("id", memberIds);
  if (profileError) throw profileError;
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  ui.memberList.replaceChildren();
  for (const member of data) {
    if (blockedUserIds.has(member.user_id)) continue;
    const item = document.createElement("li");
    const person = document.createElement("span");
    person.className = "community-member-person";
    const avatar = document.createElement("span");
    avatar.className = "community-member-avatar";
    avatar.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    const profile = profileById.get(member.user_id);
    const displayName = profile?.display_name || "Learner";
    name.textContent = displayName;
    avatar.textContent = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "CC";
    if (profile?.avatar_path) {
      void getAvatarUrl(profile.avatar_path).then((url) => {
        const image = document.createElement("img");
        image.src = url;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        avatar.replaceChildren(image);
      }).catch((error) => {
        setStatus("Could not load a community member's photo: " + error.message, "error");
      });
    }
    person.append(avatar, name);
    item.append(person);
    if (member.user_id !== currentUser.id) {
      const message = document.createElement("button");
      message.type = "button";
      message.className = "community-chat-action";
      message.textContent = "Message privately";
      message.addEventListener("click", () => { void openDirectMessage(member.user_id, groupId); });
      item.append(message);
    } else {
      const you = document.createElement("span");
      you.className = "community-member-you";
      you.textContent = "You";
      item.append(you);
    }
    ui.memberList.append(item);
  }
}

async function loadBlockedUsers() {
  const { data, error } = await supabase
    .from("community_blocks")
    .select("blocked_user_id")
    .eq("blocker_id", currentUser.id);
  if (error) throw error;
  blockedUserIds = new Set(data.map((block) => block.blocked_user_id));
}

function renderPresence() {
  if (!chatChannel) return;
  const presence = chatChannel.presenceState();
  const onlineUsers = Object.values(presence).flat().filter((entry) => (
    entry.user_id && !blockedUserIds.has(entry.user_id)
  ));
  const count = new Set(onlineUsers.map((entry) => entry.user_id)).size;
  ui.onlineCount.textContent = count + (count === 1 ? " learner online" : " learners online");
}

function selectCommunityModule(module) {
  activeCommunityModule = module;
  for (const button of ui.modules) {
    if (button.dataset.communityModule === module) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  for (const panel of ui.modulePanels) {
    panel.hidden = panel.dataset.communityPanel !== module;
  }
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function createMessageItem(message) {
  const item = document.createElement("li");
  item.className = "community-chat-message";

  const heading = document.createElement("div");
  heading.className = "community-chat-message-heading";
  const author = document.createElement("strong");
  author.textContent = message.community_profiles?.display_name || "Learner";
  const timestamp = document.createElement("time");
  timestamp.dateTime = message.created_at;
  timestamp.textContent = formatTime(message.created_at);
  heading.append(author, timestamp);

  const body = document.createElement("p");
  body.textContent = message.removed_at ? "Message removed by a moderator." : message.body;
  item.append(heading, body);

  if (!message.removed_at && (message.user_id !== currentUser.id || isModerator)) {
    const actions = document.createElement("div");
    actions.className = "community-chat-message-actions";
    if (message.user_id !== currentUser.id) {
      const report = document.createElement("button");
      report.type = "button";
      report.className = "community-chat-action";
      report.textContent = "Report";
      report.addEventListener("click", () => {
        reportingMessageId = message.id;
        ui.reportForm.reset();
        ui.reportDialog.showModal();
        ui.reportReason.focus();
      });
      actions.append(report);

      const privateMessage = document.createElement("button");
      privateMessage.type = "button";
      privateMessage.className = "community-chat-action";
      privateMessage.textContent = "Message privately";
      privateMessage.addEventListener("click", () => { void openDirectMessage(message.user_id, activeSector?.id); });
      actions.append(privateMessage);

      if (!blockedUserIds.has(message.user_id)) {
        const block = document.createElement("button");
        block.type = "button";
        block.className = "community-chat-action";
        block.textContent = "Block learner";
        block.addEventListener("click", () => blockUser(message.user_id));
        actions.append(block);
      }
    }

    if (isModerator) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "community-chat-action community-chat-moderator-action";
      remove.textContent = "Remove message";
      remove.addEventListener("click", () => removeMessage(message.id));
      actions.append(remove);
    }
    item.append(actions);
  }
  return item;
}

function directMessageThreadKey(message) {
  if (message.sender_is_admin || (message.user_b_id === null && message.user_a_id === currentUser.id)) return "admin";
  return message.user_a_id === currentUser.id ? message.user_b_id : message.user_a_id;
}

async function loadDirectMessageThreads() {
  const { data, error } = await supabase
    .from("community_direct_messages")
    .select("id,user_a_id,user_b_id,sender_id,recipient_id,sender_is_admin,group_id,body,created_at")
    .or("user_a_id.eq." + currentUser.id + ",user_b_id.eq." + currentUser.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const peerIds = [...new Set(data.flatMap((message) => [message.user_a_id, message.user_b_id]).filter((id) => id && id !== currentUser.id))];
  if (peerIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("community_profiles")
      .select("id,display_name")
      .in("id", peerIds);
    if (profileError) throw profileError;
    directMessageProfiles = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  }

  const latestByPeer = new Map();
  for (const message of data) {
    const key = directMessageThreadKey(message);
    if (!latestByPeer.has(key)) latestByPeer.set(key, message);
  }
  ui.directMessageThreads.replaceChildren();
  if (!latestByPeer.size) {
    const empty = document.createElement("li");
    empty.textContent = "No direct messages yet. Choose Message privately beside a community member to start a conversation.";
    ui.directMessageThreads.append(empty);
    return;
  }
  for (const [peerId, message] of latestByPeer) {
    const item = document.createElement("li");
    const select = document.createElement("button");
    select.type = "button";
    select.className = "community-direct-message-thread";
    select.textContent = (peerId === "admin" ? "CacheCourse Admin" : directMessageProfiles.get(peerId) || "Community member")
      + " · " + message.body.slice(0, 72);
    select.addEventListener("click", () => {
      directMessagePeerId = peerId === "admin" ? null : peerId;
      directMessageGroupId = message.group_id || activeSector?.id || null;
      ui.directMessagePeer.textContent = peerId === "admin"
        ? "Private conversation with CacheCourse Admin."
        : "Private conversation with " + (directMessageProfiles.get(peerId) || "a community member") + ".";
      ui.directMessageForm.hidden = false;
      void renderDirectMessageHistory();
    });
    item.append(select);
    ui.directMessageThreads.append(item);
  }
}

async function renderDirectMessageHistory() {
  if (directMessagePeerId === undefined) {
    ui.directMessageHistory.replaceChildren();
    ui.directMessageForm.hidden = true;
    return;
  }
  const { data, error } = await supabase
    .from("community_direct_messages")
    .select("id,user_a_id,user_b_id,sender_id,recipient_id,sender_is_admin,group_id,body,created_at")
    .or("user_a_id.eq." + currentUser.id + ",user_b_id.eq." + currentUser.id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  const messages = data.filter((message) => directMessageThreadKey(message) === (directMessagePeerId || "admin"));
  ui.directMessageHistory.replaceChildren();
  for (const message of messages) {
    const item = document.createElement("li");
    item.className = "community-chat-message";
    const heading = document.createElement("div");
    heading.className = "community-chat-message-heading";
    const sender = document.createElement("strong");
    sender.textContent = message.sender_is_admin
      ? "CacheCourse Admin"
      : message.sender_id === currentUser.id ? "You" : directMessageProfiles.get(message.sender_id) || "Community member";
    const time = document.createElement("time");
    time.dateTime = message.created_at;
    time.textContent = formatTime(message.created_at);
    heading.append(sender, time);
    const body = document.createElement("p");
    body.textContent = message.body;
    item.append(heading, body);
    ui.directMessageHistory.append(item);
  }
  ui.directMessageHistory.scrollTop = ui.directMessageHistory.scrollHeight;
}

async function openDirectMessage(peerId, groupId = null) {
  if (!currentUser) return;
  directMessagePeerId = peerId;
  directMessageGroupId = groupId;
  ui.directMessageBody.value = "";
  ui.directMessagePeer.textContent = peerId === undefined
    ? "Choose a conversation or select a member from the community."
    : peerId === null
      ? "Private conversation with CacheCourse Admin."
      : "Private conversation with " + (directMessageProfiles.get(peerId) || "a community member") + ".";
  ui.directMessageForm.hidden = peerId === undefined;
  ui.directMessageDialog.showModal();
  ui.directMessageStatus.textContent = "";
  try {
    await loadDirectMessageThreads();
    if (peerId) ui.directMessagePeer.textContent = "Private conversation with " + (directMessageProfiles.get(peerId) || "a community member") + ".";
    await renderDirectMessageHistory();
  } catch (error) {
    ui.directMessageStatus.textContent = "Could not load direct messages: " + error.message;
  }
}

async function loadMessages() {
  if (!activeSector) return;
  const { data, error } = await supabase
    .from("community_messages")
    .select("id,user_id,group_id,body,created_at,removed_at,community_profiles!community_messages_user_id_fkey(display_name)")
    .eq("group_id", activeSector.id)
    .order("created_at", { ascending: false })
    .limit(maxMessages);
  if (error) throw error;

  const items = data.reverse()
    .filter((message) => !blockedUserIds.has(message.user_id))
    .map(createMessageItem);
  ui.messages.replaceChildren(...items);
  ui.messages.scrollTop = ui.messages.scrollHeight;
}

async function blockUser(userId) {
  if (!window.confirm("Block this learner? Their messages will be hidden from you in all sector groups.")) return;
  const { error } = await supabase.from("community_blocks").insert({
    blocker_id: currentUser.id,
    blocked_user_id: userId
  });
  if (error) {
    setStatus("Could not block this learner: " + error.message, "error");
    return;
  }
  blockedUserIds.add(userId);
  await refreshMessages();
  setStatus("Learner blocked. Their messages are hidden from you.");
}

async function showBlockedUsers() {
  try {
    const { data, error } = await supabase
      .from("community_blocks")
      .select("blocked_user_id,created_at,community_profiles!community_blocks_blocked_user_id_fkey(display_name)")
      .eq("blocker_id", currentUser.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    ui.blocksList.replaceChildren();
    if (!data.length) {
      const empty = document.createElement("li");
      empty.textContent = "You have not blocked anyone.";
      ui.blocksList.append(empty);
    }
    for (const blocked of data) {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = blocked.community_profiles?.display_name || "Learner";
      const unblock = document.createElement("button");
      unblock.type = "button";
      unblock.className = "community-chat-action";
      unblock.textContent = "Unblock";
      unblock.addEventListener("click", async () => {
        const { error: unblockError } = await supabase
          .from("community_blocks")
          .delete()
          .eq("blocker_id", currentUser.id)
          .eq("blocked_user_id", blocked.blocked_user_id);
        if (unblockError) {
          setStatus("Could not unblock this learner: " + unblockError.message, "error");
          return;
        }
        blockedUserIds.delete(blocked.blocked_user_id);
        await refreshMessages();
        await showBlockedUsers();
        setStatus("Learner unblocked.");
      });
      item.append(name, unblock);
      ui.blocksList.append(item);
    }
    ui.blocksDialog.showModal();
  } catch (error) {
    setStatus("Could not load blocked learners: " + error.message, "error");
  }
}

async function removeMessage(messageId) {
  if (!window.confirm("Remove this message for everyone in the group? Its text will be replaced with a removal notice.")) return;
  const { data, error } = await supabase
    .from("community_messages")
    .update({ body: "Message removed by a moderator.", removed_at: new Date().toISOString() })
    .eq("id", messageId)
    .is("removed_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    setStatus("Could not remove this message: " + error.message, "error");
    return;
  }
  if (!data) {
    setStatus("Could not remove this message: it may already be removed or you may not have permission.", "error");
    return;
  }
  await refreshMessages();
  setStatus("Message removed.");
}

async function refreshMessages() {
  try {
    await loadMessages();
  } catch (error) {
    setStatus("Could not load group messages: " + error.message, "error");
  }
}

async function startSectorChat(sector) {
  if (!currentUser || !isMemberOf(sector.id) || chatChannel) return;
  activeSector = sector;
  ui.room.hidden = false;
  ui.joinPanel.hidden = true;
  ui.groupDescription.textContent = sector.summary;
  setStatus("Connecting to " + sector.name + "…");

  try {
    await loadGroupMembers(sector.id);
    const topic = "sector-" + sector.id;
    chatChannel = supabase.channel(topic, {
      config: { private: true, presence: { key: currentUser.id } }
    })
      .on("presence", { event: "sync" }, renderPresence)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "community_messages",
        filter: "group_id=eq." + sector.id
      }, refreshMessages)
      .subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          const { error: trackError } = await chatChannel.track({
            user_id: currentUser.id,
            display_name: currentUser.user_metadata?.display_name || "Learner"
          });
          if (trackError) setStatus("You are in the group, but online presence could not start: " + trackError.message, "error");
          else setStatus("Connected to " + sector.name + ".");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setStatus("Could not connect to this group: " + (error?.message || status), "error");
        }
      });

    await loadMessages();
  } catch (error) {
    await removeChannel();
    setStatus("Could not open this sector conversation: " + error.message, "error");
  }
}

function renderSectorRoute() {
  const hash = window.location.hash;
  if (hash && hash !== "#sector-groups" && !hash.startsWith("#sector/")) return;
  const sector = selectedSectorFromHash();
  ui.grid.hidden = Boolean(sector);
  ui.groupView.hidden = !sector;
  if (!sector) {
    if (hash === "#sector-groups" || !hash) {
      if (chatChannel) void removeChannel();
      ui.room.hidden = true;
      ui.workspace.hidden = true;
    }
    activeSector = undefined;
    return;
  }

  if (activeCommunityId !== sector.id) {
    activeCommunityId = sector.id;
    selectCommunityModule("overview");
  }
  if (chatChannel && activeSector?.id !== sector.id) {
    void removeChannel().then(() => {
      if (selectedSectorFromHash()?.id === sector.id && isMemberOf(sector.id)) void startSectorChat(sector);
    });
  }
  activeSector = sector;
  ui.groupKicker.textContent = "PROFESSIONAL SECTOR COMMUNITY";
  ui.groupTitle.textContent = sector.name;
  ui.groupDescription.textContent = sector.summary;
  ui.moduleOverviewTitle.textContent = sector.name;
  ui.moduleOverviewDescription.textContent = sector.summary;
  ui.room.hidden = true;
  ui.join.disabled = !sector.active;
  if (!currentUser) {
    ui.workspace.hidden = true;
    ui.joinPanel.hidden = true;
    if (supabase) {
      setStatus("Sign in or create an account to join this private conversation.");
    }
    return;
  }

  if (isMemberOf(sector.id)) {
    ui.joinPanel.hidden = true;
    ui.workspace.hidden = false;
    selectCommunityModule(activeCommunityModule);
    if (!chatChannel) void startSectorChat(sector);
    return;
  }

  ui.workspace.hidden = true;
  ui.joinPanel.hidden = false;
  const pendingRequest = hasPendingMembershipRequest(sector.id);
  ui.join.disabled = pendingRequest;
  ui.join.textContent = pendingRequest
    ? "Request pending"
    : memberships.length ? "Request to join" : "Join Group";
  ui.membershipNote.textContent = pendingRequest
    ? "Your request to join this community is awaiting admin approval."
    : !sector.active
      ? "This group is not active in Supabase. Apply the community sector-group migration and activate its record before joining."
    : memberships.length
      ? "You’re already in " + memberships.map((group) => group.name).join(", ") + ". Request approval to join another community."
      : "Join this group to take part in its private conversation.";
  setStatus(pendingRequest
    ? "Your membership request is awaiting admin approval."
    : !sector.active
      ? "This group is listed but not yet active in Supabase."
    : memberships.length
      ? "You can request admin approval to join an additional group."
      : "Choose this group to join its live conversation.");
}

async function joinSelectedGroup() {
  const sector = selectedSectorFromHash();
  if (!sector) return;
  if (!sector.active) {
    setStatus("This group is not active in Supabase. Apply the community sector-group migration and activate its record before joining.", "error");
    return;
  }
  if (!currentUser) {
    void openAccountDialog("signin");
    ui.accountStatus.textContent = "Log in or sign up to join " + sector.name + ".";
    return;
  }
  ui.join.disabled = true;
  setStatus((memberships.length ? "Requesting to join " : "Joining ") + sector.name + "…");
  try {
    const { data, error } = await supabase.rpc("join_community_group", { requested_group_id: sector.id });
    if (error) throw error;
    await loadMembership();
    updateAccountView();
    if (data === "requested") {
      ui.membershipNote.textContent = "Your request was sent. You can join this community after admin approval.";
      ui.join.textContent = "Request pending";
      ui.join.disabled = true;
      setStatus("Your request to join " + sector.name + " was sent for admin approval.");
    } else {
      await loadBlockedUsers();
      await renderSectorRoute();
      setStatus(data === "already_member" ? "You are already a member of " + sector.name + "." : "You joined " + sector.name + ".");
    }
  } catch (error) {
    setStatus("Could not join this group: " + error.message, "error");
  } finally {
    if (!hasPendingMembershipRequest(sector.id)) ui.join.disabled = false;
  }
}

async function leaveCurrentGroup() {
  if (!activeSector || !isMemberOf(activeSector.id) || !window.confirm("Leave " + activeSector.name + "? You will no longer be able to read its conversation unless you join it again.")) return;
  ui.leaveGroup.disabled = true;
  try {
    await removeChannel();
    const { error } = await supabase.rpc("leave_community_group", { requested_group_id: activeSector.id });
    if (error) throw error;
    await loadMembership();
    updateAccountView();
    ui.messages.replaceChildren();
    ui.memberList.replaceChildren();
    activeSector = undefined;
    renderSectorRoute();
    setStatus("You left the sector group.");
  } catch (error) {
    setStatus("Could not leave this group: " + error.message, "error");
  } finally {
    ui.leaveGroup.disabled = false;
  }
}

async function startSession(user) {
  currentUser = user;
  window.dispatchEvent(new Event("cachecourse:auth-changed"));
  updateAccountView();
  try {
    await startDirectMessageFeed();
    await loadMembership();
    updateAccountView();
    await loadBlockedUsers();
    const { data, error } = await supabase.rpc("is_community_moderator");
    if (error) throw error;
    isModerator = data === true;
    renderSectorRoute();
    if (!selectedSectorFromHash()) {
      setStatus(memberships.length
        ? "You’re a member of " + memberships.map((group) => group.name).join(", ") + ". Open a group to see its live conversation."
        : "Choose one sector group to join its private conversation.");
    }
  } catch (error) {
    setStatus("Could not load your community membership: " + error.message, "error");
    ui.accountStatus.textContent = "Signed in, but your group membership could not be loaded: " + error.message;
  }
}

async function handleAuth(event) {
  event.preventDefault();
  const submitter = event.submitter;
  const action = submitter?.value;
  const email = ui.email.value.trim();
  const password = ui.password.value;
  const displayName = ui.displayName.value.trim();
  if (!submitter || !["signin", "signup", "reset", "update"].includes(action)) return;
  if (action === "signup" && displayName.length < 2) {
    ui.accountStatus.textContent = "Enter a display name with at least two characters.";
    ui.displayName.focus();
    return;
  }

  submitter.disabled = true;
  ui.accountStatus.textContent = action === "signup" ? "Creating your account…"
    : action === "reset" ? "Sending your password-reset link…"
      : action === "update" ? "Saving your new password…" : "Signing in…";
  try {
    if (action === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin + "/community.html"
        }
      });
      if (error) throw error;
      if (data.session) {
        await startSession(data.session.user);
        ui.accountDialog.close();
      } else {
        ui.accountStatus.textContent = "Account created. Check your email to confirm it, then sign in and choose your sector group.";
      }
    } else if (action === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/community.html"
      });
      if (error) throw error;
      ui.accountStatus.textContent = "If an account exists for that email, a password-reset link will arrive shortly. Check your inbox and spam folder.";
    } else if (action === "update") {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (!data.user) throw new Error("The password changed, but the account session could not be verified. Log in with your new password.");
      await startSession(data.user);
      ui.accountDialog.close();
      setStatus("Your password was updated.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await startSession(data.user);
      ui.accountDialog.close();
    }
  } catch (error) {
    const operation = action === "signup" ? "create your account"
      : action === "reset" ? "send a password-reset link"
        : action === "update" ? "update your password" : "sign in";
    ui.accountStatus.textContent = "Could not " + operation + ": " + error.message;
  } finally {
    submitter.disabled = false;
  }
}

async function changeProfilePhoto(file) {
  if (!file || !currentUser) return;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) {
    ui.profileStatus.textContent = "Choose a JPG, PNG, or WebP image.";
    ui.profileAvatarFile.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    ui.profileStatus.textContent = "Choose an image smaller than 5 MB.";
    ui.profileAvatarFile.value = "";
    return;
  }
  ui.profileAvatarFile.disabled = true;
  ui.profileStatus.textContent = "Uploading your profile photo…";
  const previousPath = profileAvatarPath;
  const path = currentUser.id + "/avatar-" + crypto.randomUUID();
  try {
    const { error: uploadError } = await supabase.storage
      .from("community-avatars")
      .upload(path, file, { cacheControl: "0", contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;
    const { error: profileError } = await supabase
      .from("community_profiles")
      .update({ avatar_path: path })
      .eq("id", currentUser.id);
    if (profileError) {
      const { error: cleanupError } = await supabase.storage.from("community-avatars").remove([path]);
      throw new Error(profileError.message + (cleanupError ? " The uploaded file could not be removed: " + cleanupError.message : ""));
    }
    profileAvatarPath = path;
    avatarUrlCache.delete(path);
    try {
      await renderProfileAvatar();
    } catch (error) {
      ui.profileStatus.textContent = "Your photo was saved, but its preview could not be loaded: " + error.message;
      return;
    }
    if (previousPath) {
      const { error: removeError } = await supabase.storage.from("community-avatars").remove([previousPath]);
      if (removeError) {
        ui.profileStatus.textContent = "Your photo was updated, but the previous image could not be cleaned up: " + removeError.message;
        return;
      }
    }
    ui.profileStatus.textContent = "Your profile photo was updated.";
    if (activeSector && isMemberOf(activeSector.id)) {
      try {
        await loadGroupMembers(activeSector.id);
      } catch (error) {
        setStatus("Your photo was updated, but the member list could not be refreshed: " + error.message, "error");
      }
    }
  } catch (error) {
    ui.profileStatus.textContent = "Could not update your profile photo: " + error.message;
  } finally {
    ui.profileAvatarFile.value = "";
    ui.profileAvatarFile.disabled = false;
  }
}

async function removeProfilePhoto() {
  if (!currentUser || !profileAvatarPath) return;
  ui.profileAvatarRemove.disabled = true;
  ui.profileStatus.textContent = "Removing your profile photo…";
  const path = profileAvatarPath;
  try {
    const { error } = await supabase
      .from("community_profiles")
      .update({ avatar_path: null })
      .eq("id", currentUser.id);
    if (error) throw error;
    profileAvatarPath = undefined;
    avatarUrlCache.delete(path);
    await renderProfileAvatar();
    const { error: removeError } = await supabase.storage.from("community-avatars").remove([path]);
    if (removeError) {
      ui.profileStatus.textContent = "Your profile photo was removed, but its stored file could not be cleaned up: " + removeError.message;
      return;
    }
    if (activeSector && isMemberOf(activeSector.id)) await loadGroupMembers(activeSector.id);
    ui.profileStatus.textContent = "Your profile photo was removed.";
  } catch (error) {
    ui.profileStatus.textContent = "Could not remove your profile photo: " + error.message;
  } finally {
    ui.profileAvatarRemove.disabled = false;
  }
}

renderSectorCards();
window.addEventListener("hashchange", renderSectorRoute);
ui.back.addEventListener("click", () => {
  window.location.hash = "sector-groups";
});
ui.join.addEventListener("click", joinSelectedGroup);
ui.leaveGroup.addEventListener("click", leaveCurrentGroup);
ui.authForm.addEventListener("submit", handleAuth);
ui.loginButton.addEventListener("click", () => { void openAccountDialog("signin"); });
ui.signupButton.addEventListener("click", () => { void openAccountDialog("signup"); });
ui.accountButton.addEventListener("click", () => { void openAccountDialog("profile"); });
ui.profileInbox.addEventListener("click", () => {
  ui.accountDialog.close();
  void openDirectMessage();
});
ui.authSwitch.addEventListener("click", () => {
  setAuthMode(authMode === "signup" || authMode === "signin" ? (authMode === "signup" ? "signin" : "signup") : "signin");
  ui.email.focus();
});
ui.forgotPassword.addEventListener("click", () => {
  setAuthMode("forgot");
  ui.accountStatus.textContent = "Enter the email address on your account and we’ll send a password-reset link.";
  ui.email.focus();
});
ui.modules.forEach((button) => {
  button.addEventListener("click", () => {
    const module = button.dataset.communityModule;
    selectCommunityModule(module);
    if (module === "messages") void openDirectMessage();
  });
});
ui.moduleOpenMessages.addEventListener("click", () => { void openDirectMessage(); });
ui.profileAvatarFile.addEventListener("change", () => {
  void changeProfilePhoto(ui.profileAvatarFile.files?.[0]);
});
ui.profileAvatarRemove.addEventListener("click", () => { void removeProfilePhoto(); });
ui.accountClose.addEventListener("click", () => ui.accountDialog.close());
ui.accountCloseProfile.addEventListener("click", () => ui.accountDialog.close());
ui.reminderCadence.addEventListener("change", async () => {
  ui.reminderCadence.disabled = true;
  try {
    await setFavoriteReminderCadence(ui.reminderCadence.value);
    ui.profileStatus.textContent = ui.reminderCadence.value === "off"
      ? "Learning reminders are off."
      : ui.reminderCadence.options[ui.reminderCadence.selectedIndex].textContent + " saved on this device.";
  } catch (error) {
    ui.profileStatus.textContent = error.message;
  } finally {
    ui.reminderCadence.disabled = false;
  }
});
ui.accountDialog.addEventListener("click", (event) => {
  if (event.target === ui.accountDialog) ui.accountDialog.close();
});

ui.signOut.addEventListener("click", async () => {
  ui.signOut.disabled = true;
  try {
    await removeChannel();
    await removeDirectMessageChannel();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    renderSignedOut();
    setStatus("You are signed out. Your group membership is saved.");
    ui.accountStatus.textContent = "You are signed out.";
  } catch (error) {
    setStatus("Could not sign out: " + error.message, "error");
    ui.accountStatus.textContent = "Could not sign out: " + error.message;
  } finally {
    ui.signOut.disabled = false;
  }
});

ui.inbox.addEventListener("click", () => { void openDirectMessage(); });
ui.directMessageClose.addEventListener("click", () => ui.directMessageDialog.close());
ui.directMessageDialog.addEventListener("click", (event) => {
  if (event.target === ui.directMessageDialog) ui.directMessageDialog.close();
});
ui.directMessageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = ui.directMessageBody.value.trim();
  if (!body || directMessagePeerId === undefined) return;
  const submit = ui.directMessageForm.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const recipientId = directMessagePeerId;
    const participants = recipientId ? [currentUser.id, recipientId].sort() : [currentUser.id];
    const { error } = await supabase.from("community_direct_messages").insert({
      user_a_id: participants[0],
      user_b_id: participants[1] || null,
      sender_id: currentUser.id,
      recipient_id: recipientId,
      sender_is_admin: false,
      group_id: recipientId ? directMessageGroupId : null,
      body
    });
    if (error) throw error;
    ui.directMessageBody.value = "";
    ui.directMessageStatus.textContent = "Private message sent.";
    await loadDirectMessageThreads();
    await renderDirectMessageHistory();
  } catch (error) {
    ui.directMessageStatus.textContent = "Could not send your private message: " + error.message;
  } finally {
    submit.disabled = false;
  }
});

ui.manageBlocks.addEventListener("click", showBlockedUsers);
ui.blocksClose.addEventListener("click", () => ui.blocksDialog.close());

ui.compose.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = ui.message.value.trim();
  if (!body || !activeSector) return;
  const button = ui.compose.querySelector("button");
  button.disabled = true;
  try {
    const { error } = await supabase.from("community_messages").insert({
      user_id: currentUser.id,
      group_id: activeSector.id,
      body
    });
    if (error) throw error;
    ui.message.value = "";
    setStatus("Message sent to " + activeSector.name + ".");
    await refreshMessages();
  } catch (error) {
    setStatus("Could not send message: " + error.message, "error");
  } finally {
    button.disabled = false;
  }
});

ui.reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reason = ui.reportReason.value.trim();
  try {
    const { error } = await supabase.from("community_reports").insert({
      reporter_id: currentUser.id,
      message_id: reportingMessageId,
      group_id: activeSector?.id,
      reason
    });
    if (error) throw error;
    ui.reportDialog.close();
    setStatus("Report sent to the moderators.");
  } catch (error) {
    setStatus("Could not submit report: " + error.message, "error");
  }
});
ui.reportDialog.querySelector("[data-report-cancel]").addEventListener("click", () => ui.reportDialog.close());

window.addEventListener("online", () => {
  if (currentUser) setStatus("Connection restored. Reconnecting to your sector group…");
});
window.addEventListener("offline", () => {
  if (currentUser) setStatus("You are offline. Live sector conversations need an internet connection.", "error");
});

if (!navigator.onLine) {
  ui.setup.hidden = false;
  setStatus("You are offline. Live sector conversations need an internet connection.", "error");
  renderSectorRoute();
} else {
  try {
    await loadCommunityChatConfig();
    if (!COMMUNITY_CHAT_CONFIG.supabaseUrl || !COMMUNITY_CHAT_CONFIG.publishableKey) {
      ui.setup.hidden = false;
      setStatus("Chat setup required. You can browse all ten sector groups.");
      renderSectorRoute();
    } else {
      supabase = await getSupabaseClient();
      if (!supabase) {
        setStatus("The chat service is unavailable while offline.", "error");
      } else {
        setAuthMode("signin");
        updateAccountView();
        setStatus("Sign in to join one of the sector groups.");

        supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") {
            setAuthMode("recovery");
            ui.auth.hidden = false;
            ui.accountProfile.hidden = true;
            if (!ui.accountDialog.open) ui.accountDialog.showModal();
            window.setTimeout(() => ui.password.focus(), 0);
            return;
          }
          if (!session?.user && currentUser) {
            void removeChannel();
            renderSignedOut();
            setStatus("Your session ended. Sign in to rejoin your group.");
          }
        });

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const { data: groupRows, error: groupsError } = await supabase
          .from("community_groups")
          .select("id,name,summary,active");
        if (groupsError) throw groupsError;
        const groupById = new Map(groupRows.map((group) => [group.id, group]));
        communitySectors = COMMUNITY_SECTORS.map((sector) => {
          const group = groupById.get(sector.id);
          return { ...sector, ...(group || {}), configured: Boolean(group), active: Boolean(group?.active) };
        });
        renderSectorCards();
        const unavailableCount = communitySectors.filter((sector) => !sector.active).length;
        if (groupRows.length === 0) {
          setStatus("All ten group choices are visible. Supabase has no sector-group records yet; apply 20261101000300_community_sector_groups.sql and the following admin access migration to enable joining.");
        } else if (unavailableCount) {
          setStatus("All ten group choices are listed. " + unavailableCount + " group" + (unavailableCount === 1 ? " is" : "s are") + " not active in Supabase and cannot be joined yet.");
        }
        if (data.session?.user) await startSession(data.session.user);
      }
    }
    renderSectorRoute();
  } catch (error) {
    ui.setup.hidden = false;
    setStatus("Could not load the chat service. Check your connection and Supabase environment variables: " + error.message, "error");
    renderSectorRoute();
  }
}
