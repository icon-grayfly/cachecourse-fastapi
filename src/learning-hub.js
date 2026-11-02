import { getAllCourses } from "./catalog-store.js";
import { loadLearningState, setFavoriteReminderCadence, toggleCourseFavorite } from "./favorites.js";

const grid = document.querySelector("#course-grid");
const search = document.querySelector("#course-search");
search.value = new URLSearchParams(location.search).get("q") || "";
const empty = document.querySelector("#course-empty");
const count = document.querySelector("#course-count");
const resultsLabel = document.querySelector("#results-label");
const departmentFilter = document.querySelector("#department-filter");
const levelFilter = document.querySelector("#level-filter");
const categoryFilter = document.querySelector("#category-filter");
const favoriteCount = document.querySelector("#favorite-count");
const favoriteListDialog = document.querySelector("#favorite-list-dialog");
const favoriteListItems = document.querySelector("#favorite-list-items");
const favoriteListStatus = document.querySelector("#favorite-list-status");
const favoriteReminder = document.querySelector("#favorite-list-reminder");
const programmes = getAllCourses();
let learnerState;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function courseSearchText(course) {
  const materialTerms = (course.materials || []).flatMap((material) => [material.title, material.source, material.type]);
  return [course.title, course.code, course.institution, course.department, course.description, course.level, course.qualification, course.category, ...materialTerms].join(" ").toLocaleLowerCase();
}

function cardMarkup(course) {
  const href = "/course.html?course=" + encodeURIComponent(course.id) + "#course-workspace";
  const isProgramme = course.kind === "programme";
  const isLocal = course.kind === "local-course";
  const index = isProgramme ? "MIVA · " + course.qualification : course.code;
  const mark = isProgramme ? "M" : course.id === "fastapi" ? "&lt;/&gt;" : isLocal ? "↗" : "C<sub>↔</sub>";
  const primaryStat = isProgramme
    ? course.id === "miva-computer-science" ? "56 published course titles · 8 semesters" : "Miva programme listing"
    : isLocal ? (course.materials?.length || 0) + " source-linked materials" : course.interactiveCount === 1 ? "1 interactive sample" : course.interactiveCount + " interactive lessons";
  const cta = isProgramme ? "Programme overview" : isLocal ? "Open course materials" : course.id === "fastapi" ? "Open pathway" : "View course";
  return '<article class="course-tile course-tile-' + escapeHtml(course.accent || "miva") + (isProgramme ? ' course-tile-programme' : '') + '">' +
    '<a class="course-tile-link" href="' + href + '">' +
      '<div class="course-tile-art" aria-hidden="true"><span class="course-tile-pattern"></span><span class="course-tile-mark">' + mark + '</span><span class="course-tile-index">' + escapeHtml(index) + '</span></div>' +
      '<div class="course-tile-content"><div class="course-tile-meta"><span>' + escapeHtml(course.department) + '</span><span>' + escapeHtml(course.level) + '</span></div>' +
      '<h3>' + escapeHtml(course.title) + '</h3><p>' + escapeHtml(course.description) + '</p>' +
      '<div class="course-tile-stats"><span>' + escapeHtml(primaryStat) + '</span><span>' + escapeHtml(course.format || "Self-paced") + '</span></div>' +
      '<div class="course-tile-footer"><span>' + escapeHtml(course.institution) + '</span><span class="course-open-label">' + cta + ' <span aria-hidden="true">↗</span></span></div></div></a>' +
      '<button class="course-favorite-toggle' + (learnerState.favorites.includes(course.id) ? ' is-favorite' : '') + '" type="button" data-favorite-course="' + escapeHtml(course.id) + '" aria-pressed="' + String(learnerState.favorites.includes(course.id)) + '" aria-label="' + (learnerState.favorites.includes(course.id) ? 'Remove ' + escapeHtml(course.title) + ' from favourites' : 'Add ' + escapeHtml(course.title) + ' to favourites') + '"><span aria-hidden="true">' + (learnerState.favorites.includes(course.id) ? '♥' : '♡') + '</span><span>' + (learnerState.favorites.includes(course.id) ? 'Saved' : 'Save course') + '</span></button>' +
    '</article>';
}

function renderFavoriteList() {
  const coursesById = new Map(programmes.map((course) => [course.id, course]));
  const favourites = learnerState.favorites.map((id) => ({ id, course: coursesById.get(id) }));
  favoriteCount.textContent = String(learnerState.favorites.length);
  favoriteReminder.value = learnerState.favoriteReminderCadence;
  favoriteListItems.replaceChildren();
  if (!favourites.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "favorite-list-empty";
    emptyItem.textContent = "Your learning wishlist is empty. Save a course from the catalogue to get started.";
    favoriteListItems.append(emptyItem);
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
    remove.className = "favorite-list-remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove " + (course?.title || "unavailable course") + " from your learning wishlist");
    remove.addEventListener("click", async () => {
      try {
        learnerState = await toggleCourseFavorite(id);
        favoriteListStatus.textContent = (course?.title || "Course") + " removed from your learning list.";
        render();
      } catch (error) {
        favoriteListStatus.textContent = error.message;
      }
    });
    item.append(title, remove);
    favoriteListItems.append(item);
  }
}

function populateDepartments() {
  const names = [...new Set(programmes.map((course) => course.department))].sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    departmentFilter.append(option);
  }
}

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const department = departmentFilter.value;
  const level = levelFilter.value;
  const category = categoryFilter.value;
  const shown = programmes.filter((course) => {
    const matchesDepartment = department === "all" || course.department === department;
    const courseLevel = course.qualification || (course.kind === "local-course" ? "Skills pathway" : course.kind === "pathway" ? "Skills pathway" : "Course");
    const matchesLevel = level === "all" || courseLevel === level || (level === "Skills pathway" && ["fastapi", "csc408"].includes(course.id));
    const courseCategory = course.category || (course.kind === "programme" ? "Academic programme" : course.kind === "local-course" ? "Course" : "Skills pathway");
    const matchesCategory = category === "all" || courseCategory === category || (category === "Skills pathway" && ["fastapi", "csc408"].includes(course.id));
    return matchesDepartment && matchesLevel && matchesCategory && (!query || courseSearchText(course).includes(query));
  });
  grid.innerHTML = shown.map(cardMarkup).join("");
  renderFavoriteList();
  empty.hidden = shown.length > 0;
  count.textContent = shown.length + (shown.length === 1 ? " catalogue entry" : " catalogue entries") + " · " + programmes.filter((course) => course.kind === "programme").length + " Miva programmes";
  resultsLabel.textContent = query || department !== "all" || level !== "all" || category !== "all" ? "Matching programmes and learning spaces" : "Miva programmes and featured learning spaces";
}

populateDepartments();
search.addEventListener("input", render);
departmentFilter.addEventListener("change", render);
levelFilter.addEventListener("change", render);
categoryFilter.addEventListener("change", render);
grid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-favorite-course]");
  if (!button) return;
  button.disabled = true;
  try {
    const course = programmes.find((entry) => entry.id === button.dataset.favoriteCourse);
    if (!course) throw new Error("That course is no longer available.");
    learnerState = await toggleCourseFavorite(course.id);
    favoriteListStatus.textContent = learnerState.favorites.includes(course.id)
      ? course.title + " added to your learning wishlist."
      : course.title + " removed from your learning wishlist.";
    render();
  } catch (error) {
    favoriteListStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
document.querySelector("#favorite-list-open").addEventListener("click", () => {
  favoriteListStatus.textContent = "";
  favoriteListDialog.showModal();
});
document.querySelector("#favorite-list-close").addEventListener("click", () => favoriteListDialog.close());
document.querySelector("#favorite-list-done").addEventListener("click", () => favoriteListDialog.close());
favoriteListDialog.addEventListener("click", (event) => {
  if (event.target === favoriteListDialog) favoriteListDialog.close();
});
favoriteReminder.addEventListener("change", async () => {
  favoriteReminder.disabled = true;
  try {
    learnerState = await setFavoriteReminderCadence(favoriteReminder.value);
    favoriteListStatus.textContent = favoriteReminder.value === "off"
      ? "Learning reminders are off."
      : favoriteReminder.options[favoriteReminder.selectedIndex].textContent + " saved on this device.";
  } catch (error) {
    favoriteListStatus.textContent = error.message;
  } finally {
    favoriteReminder.disabled = false;
  }
});
loadLearningState().then((state) => {
  learnerState = state;
  render();
}).catch((error) => {
  learnerState = { favorites: [], favoriteReminderCadence: "weekly" };
  favoriteListStatus.textContent = "Could not load your saved courses: " + error.message;
  render();
});
