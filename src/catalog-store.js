import { COURSES } from "./catalog.js";

const STORAGE_KEY = "cachecourse-admin-catalog-v1";
const MAX_COURSES = 200;
const MAX_MATERIALS = 80;
const MAX_FIELD_LENGTH = 5000;

function safeText(value, limit = 240) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeMaterial(material, index) {
  if (!material || typeof material !== "object") return null;
  const href = safeUrl(material.href);
  const title = safeText(material.title, 180);
  if (!title || !href) return null;
  return {
    id: safeText(material.id, 80) || "material-" + index,
    title,
    detail: safeText(material.detail, MAX_FIELD_LENGTH),
    duration: safeText(material.duration, 100) || "Self-paced",
    type: safeText(material.type, 100) || "Learning material",
    section: safeText(material.section, 120) || "Course materials",
    href,
    source: safeText(material.source, 180) || new URL(href).hostname,
    sourceLicense: safeText(material.sourceLicense, 180) || "Terms not specified · check the source",
    sourceCheckedAt: safeText(material.sourceCheckedAt, 40),
    access: safeText(material.access, 120) || "External link · connection required"
  };
}

function normalizeCourse(course) {
  if (!course || typeof course !== "object" || typeof course.id !== "string" || !/^local-[a-z0-9-]{3,80}$/.test(course.id)) return null;
  const materials = Array.isArray(course.materials) ? course.materials.slice(0, MAX_MATERIALS).map(normalizeMaterial).filter(Boolean) : [];
  const title = safeText(course.title, 180);
  const department = safeText(course.department, 160);
  if (!title || !department || !materials.length) return null;
  const sections = new Map();
  for (const material of materials) {
    if (!sections.has(material.section)) sections.set(material.section, []);
    sections.get(material.section).push({
      moduleKey: "material:" + material.id,
      title: material.title,
      detail: material.detail,
      duration: material.duration,
      type: material.type,
      href: material.href,
      source: material.source,
      sourceLicense: material.sourceLicense,
      sourceCheckedAt: material.sourceCheckedAt,
      access: material.access
    });
  }
  const groups = [...sections.entries()].map(([section, items]) => ({ title: section, subtitle: "Added course materials · online source links", items }));
  return {
    id: course.id,
    kind: "local-course",
    institution: safeText(course.institution, 180) || "CacheCourse community catalog",
    department,
    code: safeText(course.code, 80) || "LOCAL",
    title,
    description: safeText(course.description, MAX_FIELD_LENGTH),
    level: safeText(course.level, 100) || "Self-paced",
    qualification: safeText(course.qualification, 100) || "Skills pathway",
    category: safeText(course.category, 100) || "Course",
    accent: "miva",
    format: safeText(course.format, 160) || "Curated source-linked materials",
    sourceNote: "Admin-added course · stored in this browser only",
    materials,
    interactiveCount: 0,
    views: { weeks: groups, sessions: groups }
  };
}

export function getLocalCourses() {
  try {
    const rows = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, MAX_COURSES).map(normalizeCourse).filter(Boolean);
  } catch {
    return [];
  }
}

export function getAllCourses() {
  return [...COURSES, ...getLocalCourses()];
}

export function getCatalogCourse(id) {
  return getAllCourses().find((course) => course.id === id) || null;
}

export function saveLocalCourse(course) {
  const normalized = normalizeCourse(course);
  if (!normalized) throw new Error("Add a course title, department, and at least one valid http(s) material link.");
  const current = getLocalCourses().map(({ views, interactiveCount, accent, sourceNote, kind, ...row }) => row);
  const existingIndex = current.findIndex((row) => row.id === normalized.id);
  if (existingIndex === -1 && current.length >= MAX_COURSES) throw new Error("The local catalog has reached its course limit.");
  if (existingIndex === -1) current.push({ ...normalized, views: undefined });
  else current[existingIndex] = { ...normalized, views: undefined };
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return normalized;
}

export function deleteLocalCourse(id) {
  const current = getLocalCourses().filter((course) => course.id !== id).map(({ views, interactiveCount, accent, sourceNote, kind, ...row }) => row);
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function exportLocalCatalog() {
  return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), courses: getLocalCourses().map(({ views, interactiveCount, accent, sourceNote, kind, ...row }) => row) }, null, 2);
}

export function importLocalCatalog(payload) {
  const incoming = Array.isArray(payload) ? payload : payload?.courses;
  if (!Array.isArray(incoming)) throw new Error("Choose a CacheCourse catalog JSON export.");
  if (incoming.length > MAX_COURSES) throw new Error("This file contains more courses than the local limit allows.");
  const merged = new Map(getLocalCourses().map((course) => [course.id, course]));
  let accepted = 0;
  for (const row of incoming) {
    const course = normalizeCourse(row);
    if (course) {
      merged.set(course.id, { ...course, views: undefined });
      accepted += 1;
    }
  }
  if (merged.size > MAX_COURSES) throw new Error("The merged catalog exceeds the local course limit.");
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged.values()]));
  return { accepted, total: merged.size };
}
