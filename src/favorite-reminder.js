import { getCatalogCourse } from "./catalog-store.js";
import { checkAndSaveFavoriteReminder } from "./favorites.js";

const reminderRegion = document.createElement("div");
reminderRegion.className = "favorite-reminder-region";
reminderRegion.setAttribute("role", "status");
reminderRegion.setAttribute("aria-live", "polite");
document.body.append(reminderRegion);

let timer;

function showReminder(courseId) {
  const course = getCatalogCourse(courseId);
  const toast = document.createElement("div");
  toast.className = "favorite-reminder-toast";
  const copy = document.createElement("p");
  copy.textContent = course
    ? "A small step today brings you closer to learning " + course.title + "."
    : "A small step today brings you closer to your learning goals.";
  toast.append(copy);
  if (course) {
    const link = document.createElement("a");
    link.href = "/course.html?course=" + encodeURIComponent(course.id) + "#course-workspace";
    link.textContent = "Open course";
    toast.append(link);
  }
  const close = document.createElement("button");
  close.type = "button";
  close.className = "favorite-reminder-close";
  close.setAttribute("aria-label", "Dismiss learning reminder");
  close.textContent = "×";
  close.addEventListener("click", () => toast.remove());
  toast.append(close);
  reminderRegion.replaceChildren(toast);
  window.setTimeout(() => toast.remove(), 6500);
}

async function checkReminder() {
  if (timer) window.clearTimeout(timer);
  timer = undefined;
  try {
    const { state, due } = await checkAndSaveFavoriteReminder();
    if (due) showReminder(state.favorites[0]);
    if (state.favorites.length && state.favoriteReminderCadence !== "off" && state.favoriteReminderLastAt) {
      const interval = state.favoriteReminderCadence === "weekly" ? 7 : 30;
      const dueAt = Date.parse(state.favoriteReminderLastAt) + interval * 24 * 60 * 60 * 1000;
      timer = window.setTimeout(checkReminder, Math.max(1000, dueAt - Date.now()));
    }
  } catch (error) {
    reminderRegion.textContent = "Your learning reminder could not be loaded: " + error.message;
  }
}

window.addEventListener("cachecourse:favorites-updated", checkReminder);
window.addEventListener("focus", checkReminder);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void checkReminder();
});
void checkReminder();
