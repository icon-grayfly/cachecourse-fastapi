import { getAllCourses } from "./catalog-store.js";

const grid = document.querySelector("#course-grid");
const search = document.querySelector("#course-search");
const empty = document.querySelector("#course-empty");
const count = document.querySelector("#course-count");
const resultsLabel = document.querySelector("#results-label");
const departmentFilter = document.querySelector("#department-filter");
const levelFilter = document.querySelector("#level-filter");
const categoryFilter = document.querySelector("#category-filter");
const programmes = getAllCourses();

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
      '<div class="course-tile-footer"><span>' + escapeHtml(course.institution) + '</span><span class="course-open-label">' + cta + ' <span aria-hidden="true">↗</span></span></div></div>' +
    '</a></article>';
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
  empty.hidden = shown.length > 0;
  count.textContent = shown.length + (shown.length === 1 ? " catalogue entry" : " catalogue entries") + " · " + programmes.filter((course) => course.kind === "programme").length + " Miva programmes";
  resultsLabel.textContent = query || department !== "all" || level !== "all" || category !== "all" ? "Matching programmes and learning spaces" : "Miva programmes and featured learning spaces";
}

populateDepartments();
search.addEventListener("input", render);
departmentFilter.addEventListener("change", render);
levelFilter.addEventListener("change", render);
categoryFilter.addEventListener("change", render);
render();
