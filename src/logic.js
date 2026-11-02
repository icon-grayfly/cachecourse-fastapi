import { LESSONS } from "./lessons.js";
import { normalizePracticeNotes } from "./api-simulator.js";

export function createInitialState() {
  return {
    route: null,
    completed: [],
    answers: {},
    diagnosticDone: false,
    packDownloaded: false,
    lastLessonId: null,
    practiceNotes: [],
    compilerModuleAnswer: null,
    compilerModuleCompleted: false,
    favorites: [],
    favoriteReminderCadence: "weekly",
    favoriteReminderLastAt: null
  };
}

export function getSuggestedRoute(answers) {
  const score = (answers || []).reduce((total, answer) => total + (answer === true ? 1 : 0), 0);
  return score >= 2 ? "fast" : "beginner";
}

export function normalizeState(value) {
  const state = value && typeof value === "object" ? value : {};
  const validIds = new Set(LESSONS.map((lesson) => lesson.id));
  const completed = Array.isArray(state.completed) ? [...new Set(state.completed.filter((id) => validIds.has(id)))] : [];
  const answers = state.answers && typeof state.answers === "object" ? state.answers : {};
  const favorites = Array.isArray(state.favorites)
    ? [...new Set(state.favorites.filter((id) => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/.test(id)))].slice(0, 200)
    : [];
  const reminderLastAt = typeof state.favoriteReminderLastAt === "string" && Number.isFinite(Date.parse(state.favoriteReminderLastAt))
    ? new Date(state.favoriteReminderLastAt).toISOString()
    : null;
  return {
    route: state.route === "fast" || state.route === "beginner" ? state.route : null,
    completed,
    answers,
    diagnosticDone: state.diagnosticDone === true,
    packDownloaded: state.packDownloaded === true,
    lastLessonId: validIds.has(state.lastLessonId) ? state.lastLessonId : null,
    practiceNotes: normalizePracticeNotes(state.practiceNotes),
    compilerModuleAnswer: ["identifier", "operator", "keyword"].includes(state.compilerModuleAnswer) ? state.compilerModuleAnswer : null,
    compilerModuleCompleted: state.compilerModuleCompleted === true && state.compilerModuleAnswer === "operator",
    favorites,
    favoriteReminderCadence: ["off", "weekly", "monthly"].includes(state.favoriteReminderCadence) ? state.favoriteReminderCadence : "weekly",
    favoriteReminderLastAt: reminderLastAt
  };
}

export function toggleFavorite(state, courseId, now = new Date()) {
  const normalized = normalizeState(state);
  if (typeof courseId !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(courseId)) {
    throw new Error("Choose a valid course to save.");
  }
  if (normalized.favorites.includes(courseId)) {
    return { ...normalized, favorites: normalized.favorites.filter((id) => id !== courseId) };
  }
  if (normalized.favorites.length >= 200) throw new Error("Your learning list has reached its limit.");
  return {
    ...normalized,
    favorites: [...normalized.favorites, courseId],
    favoriteReminderLastAt: normalized.favorites.length ? normalized.favoriteReminderLastAt : now.toISOString()
  };
}

export function setFavoriteReminderCadence(state, cadence, now = new Date()) {
  if (!["off", "weekly", "monthly"].includes(cadence)) throw new Error("Choose a supported reminder frequency.");
  return {
    ...normalizeState(state),
    favoriteReminderCadence: cadence,
    favoriteReminderLastAt: now.toISOString()
  };
}

export function checkFavoriteReminder(state, now = new Date()) {
  const normalized = normalizeState(state);
  if (!normalized.favorites.length || normalized.favoriteReminderCadence === "off") {
    return { state: normalized, due: false };
  }
  if (!normalized.favoriteReminderLastAt) {
    return {
      state: { ...normalized, favoriteReminderLastAt: now.toISOString() },
      due: false
    };
  }
  const interval = normalized.favoriteReminderCadence === "weekly" ? 7 : 30;
  const elapsed = now.getTime() - Date.parse(normalized.favoriteReminderLastAt);
  if (elapsed < interval * 24 * 60 * 60 * 1000) return { state: normalized, due: false };
  return {
    state: { ...normalized, favoriteReminderLastAt: now.toISOString() },
    due: true
  };
}

export function answerCompilerQuestion(state, answer) {
  const normalized = normalizeState(state);
  if (normalized.compilerModuleCompleted) return normalized;
  const validAnswers = new Set(["identifier", "operator", "keyword"]);
  const selected = validAnswers.has(answer) ? answer : null;
  return {
    ...normalized,
    compilerModuleAnswer: selected,
    compilerModuleCompleted: normalized.compilerModuleCompleted || selected === "operator"
  };
}

export function setRoute(state, route) {
  if (route !== "beginner" && route !== "fast") throw new Error("Route must be beginner or fast.");
  return { ...normalizeState(state), route };
}

export function getNextLesson(state) {
  const normalized = normalizeState(state);
  return LESSONS.find((lesson) => !normalized.completed.includes(lesson.id)) || null;
}

export function completeLesson(state, lessonId, answer) {
  const normalized = normalizeState(state);
  if (!LESSONS.some((lesson) => lesson.id === lessonId)) throw new Error("Unknown lesson.");
  if (!normalized.completed.includes(lessonId)) normalized.completed.push(lessonId);
  normalized.answers = { ...normalized.answers, [lessonId]: answer };
  normalized.lastLessonId = lessonId;
  return normalized;
}

export function isOpportunityUnlocked(state) {
  return normalizeState(state).completed.length === LESSONS.length;
}
