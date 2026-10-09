import { COURSES } from "./catalog.js";
import { PROGRAMMES } from "./programmes.js";
import { deleteLocalCourse, exportLocalCatalog, getLocalCourses, importLocalCatalog, saveLocalCourse } from "./catalog-store.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#course-form");
const materialsList = $("#materials-list");
const materialTemplate = $("#material-template");
const status = $("#admin-status");
let editingId = "";

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

function downloadExport() {
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

function loadImport(file) {
  if (!file) return;
  file.text().then((text) => {
    const result = importLocalCatalog(JSON.parse(text));
    refreshList();
    status.textContent = result.accepted + " course records imported or updated. The local catalogue now has " + result.total + " courses.";
  }).catch((error) => {
    status.textContent = error.message || "Could not import that JSON file.";
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
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

materialsList.addEventListener("click", (event) => {
  const remove = event.target.closest(".admin-remove-material");
  if (!remove) return;
  const row = remove.closest("[data-material-row]");
  if (materialsList.querySelectorAll("[data-material-row]").length === 1) {
    row.querySelectorAll("input, textarea").forEach((field) => { field.value = ""; });
    row.querySelector("select").selectedIndex = 0;
  } else row.remove();
});

$("#add-material").addEventListener("click", () => {
  addMaterial();
  materialsList.lastElementChild.querySelector("input").focus();
});

$("#local-course-list").addEventListener("click", (event) => {
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

addMaterial();
refreshDepartments();
refreshList();
