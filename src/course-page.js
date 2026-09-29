import { getCourse, getCourseSchedule } from "./catalog.js";

const $ = (selector) => document.querySelector(selector);
const courseId = new URLSearchParams(window.location.search).get("course");
const course = getCourse(courseId);
const groups = $("#schedule-groups");
const viewButtons = [...document.querySelectorAll(".schedule-view")];
let selectedView = "weeks";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderMissingCourse() {
  $("#course-page").innerHTML = '<section class="course-missing"><div class="section-kicker">LEARNING HUB</div><h1>That course is not here yet.</h1><p>Choose an available learning space from the course catalogue.</p><a class="button button-primary" href="/learning-hub.html">Browse learning spaces <span aria-hidden="true">→</span></a></section>';
}

function renderGroup(group, index) {
  const items = group.items.map((item) => {
    const content = '<span class="schedule-item-icon" aria-hidden="true">' + (item.href ? '↗' : '•') + '</span><span class="schedule-item-copy"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span></span><span class="schedule-item-meta"><span>' + escapeHtml(item.type) + '</span><strong>' + escapeHtml(item.duration) + '</strong></span>';
    return item.href
      ? '<a class="schedule-item is-available" href="' + escapeHtml(item.href) + '">' + content + '</a>'
      : '<div class="schedule-item is-reference">' + content + '</div>';
  }).join("");
  return '<article class="schedule-group"><div class="schedule-group-heading"><span class="schedule-group-number">' + String(index + 1).padStart(2, "0") + '</span><div><h3>' + escapeHtml(group.title) + '</h3><p>' + escapeHtml(group.subtitle) + '</p></div></div><div class="schedule-items">' + items + '</div></article>';
}

function renderSchedule() {
  const schedule = getCourseSchedule(course.id, selectedView);
  groups.innerHTML = schedule.map(renderGroup).join("");
  viewButtons.forEach((button) => {
    const selected = button.dataset.view === selectedView;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $("#schedule-description").textContent = selectedView === "weeks"
    ? (course.id === "fastapi" ? "A suggested sequence you can move through at your own pace." : "Sections follow the week ranges and page numbers in the supplied course summary.")
    : "Suggested time blocks help you plan focused study; adjust them to fit your day.";
  $("#schedule-context").textContent = course.id === "fastapi" && selectedView === "sessions"
    ? "Each block is a suggested 1-hour study session. The short lesson durations show core content time; the rest is for hands-on practice and review."
    : course.id === "csc408" && selectedView === "sessions"
      ? "One interactive sample is available. The other entries point back to your supplied course document and are not interactive modules yet. Suggested blocks are flexible, not an official timetable."
      : course.id === "fastapi"
        ? "The week labels are a suggested CacheCourse sequence, not an institutional timetable. The pathway remains self-paced."
        : "Interactive material is labeled separately from source reading. The source document's reuse license is not stated.";
}

function renderCourse() {
  document.title = course.title + " · Learning Hub · CacheCourse";
  $("#course-breadcrumb-current").textContent = course.code;
  $("#course-eyebrow").textContent = course.institution.toLocaleUpperCase() + " · " + course.department.toLocaleUpperCase();
  $("#course-code").textContent = course.code;
  $("#course-level").textContent = course.level;
  $("#course-title").textContent = course.title;
  $("#course-description").textContent = course.description;
  $("#course-department").textContent = course.department;
  $("#course-institution").textContent = course.institution;
  $("#course-format").textContent = course.format;
  $("#course-art").classList.add("course-art-" + course.accent);
  $("#course-actions").innerHTML = course.id === "fastapi"
    ? '<a class="button button-primary" href="/index.html#lesson-list">Open learning pathway <span aria-hidden="true">→</span></a><a class="course-secondary-link" href="/api-studio.html">Go to API Studio <span aria-hidden="true">↗</span></a>'
    : '<a class="button button-primary" href="/module-compiler.html">Open interactive sample <span aria-hidden="true">→</span></a><span class="course-action-note">1 short module ready</span>';
  $("#course-source-note").innerHTML = '<div class="course-source-icon" aria-hidden="true">↳</div><div><div class="section-kicker">SOURCE & CONTENT STATUS</div><p><strong>' + escapeHtml(course.sourceNote) + '</strong> ' + (course.id === "csc408" ? "The interactive sample uses an original explanation and exercise. The document's reuse license is not stated; other sections remain source-reading references." : "Original lesson summaries link to official FastAPI documentation. Each reference and license note appears with its lesson.") + '</p></div><a href="/sources.html">Review source notes <span aria-hidden="true">→</span></a>';
  renderSchedule();
}

if (!course) {
  renderMissingCourse();
} else {
  viewButtons.forEach((button) => button.addEventListener("click", () => {
    selectedView = button.dataset.view;
    renderSchedule();
  }));
  renderCourse();
}
