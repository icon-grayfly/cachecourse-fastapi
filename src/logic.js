import { LESSONS } from "./lessons.js";
import { normalizePracticeNotes } from "./api-simulator.js";

export function createInitialState() {
  return { route: null, completed: [], answers: {}, diagnosticDone: false, packDownloaded: false, lastLessonId: null, practiceNotes: [] };
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
  return {
    route: state.route === "fast" || state.route === "beginner" ? state.route : null,
    completed,
    answers,
    diagnosticDone: state.diagnosticDone === true,
    packDownloaded: state.packDownloaded === true,
    lastLessonId: validIds.has(state.lastLessonId) ? state.lastLessonId : null,
    practiceNotes: normalizePracticeNotes(state.practiceNotes)
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
