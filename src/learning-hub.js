import { COURSES } from "./catalog.js";

const grid = document.querySelector("#course-grid");
const search = document.querySelector("#course-search");
const empty = document.querySelector("#course-empty");
const count = document.querySelector("#course-count");
const resultsLabel = document.querySelector("#results-label");
const filters = [...document.querySelectorAll(".hub-filter")];
let department = "all";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function cardMarkup(course) {
  const href = "/course.html?course=" + encodeURIComponent(course.id);
  const pathwayLabel = course.id === "fastapi" ? "Open pathway" : "View course";
  const moduleLabel = course.interactiveCount === 1 ? "1 interactive sample" : course.interactiveCount + " interactive lessons";
  return '<article class="course-tile course-tile-' + escapeHtml(course.accent) + '">' +
    '<a class="course-tile-link" href="' + href + '">' +
      '<div class="course-tile-art" aria-hidden="true"><span class="course-tile-pattern"></span><span class="course-tile-mark">' + (course.id === "fastapi" ? '&lt;/&gt;' : 'C<sub>↔</sub>') + '</span><span class="course-tile-index">' + escapeHtml(course.code) + '</span></div>' +
      '<div class="course-tile-content"><div class="course-tile-meta"><span>' + escapeHtml(course.department) + '</span><span>' + escapeHtml(course.level) + '</span></div>' +
      '<h3>' + escapeHtml(course.title) + '</h3><p>' + escapeHtml(course.description) + '</p>' +
      '<div class="course-tile-stats"><span>' + moduleLabel + '</span><span>' + escapeHtml(course.format) + '</span></div>' +
      '<div class="course-tile-footer"><span>' + escapeHtml(course.institution) + '</span><span class="course-open-label">' + pathwayLabel + ' <span aria-hidden="true">↗</span></span></div></div>' +
    '</a></article>';
}

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const shown = COURSES.filter((course) => {
    const matchesDepartment = department === "all" || course.department === department;
    const searchable = [course.title, course.code, course.institution, course.department, course.description].join(" ").toLocaleLowerCase();
    return matchesDepartment && (!query || searchable.includes(query));
  });
  grid.innerHTML = shown.map(cardMarkup).join("");
  empty.hidden = shown.length > 0;
  count.textContent = shown.length + (shown.length === 1 ? " learning space" : " learning spaces");
  resultsLabel.textContent = query || department !== "all" ? "Matching learning spaces" : "Featured learning spaces";
}

filters.forEach((button) => button.addEventListener("click", () => {
  department = button.dataset.department;
  filters.forEach((filter) => {
    const selected = filter === button;
    filter.classList.toggle("is-selected", selected);
    filter.setAttribute("aria-pressed", String(selected));
  });
  render();
}));
search.addEventListener("input", render);
render();
