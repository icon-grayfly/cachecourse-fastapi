import {
  checkFavoriteReminder,
  createInitialState,
  normalizeState,
  setFavoriteReminderCadence as setCadence,
  toggleFavorite as toggleFavoriteState
} from "./logic.js";
import { loadProgress, saveProgress } from "./storage.js";

export async function loadLearningState() {
  return normalizeState(await loadProgress(createInitialState()));
}

export async function saveLearningState(state) {
  const normalized = normalizeState(state);
  if (!await saveProgress(normalized)) {
    throw new Error("Could not save your learning list on this device.");
  }
  return normalized;
}

export async function toggleCourseFavorite(courseId) {
  const state = await loadLearningState();
  const updated = await saveLearningState(toggleFavoriteState(state, courseId));
  window.dispatchEvent(new CustomEvent("cachecourse:favorites-updated"));
  return updated;
}

export async function setFavoriteReminderCadence(cadence) {
  const state = await loadLearningState();
  const updated = setCadence(state, cadence);
  const saved = await saveLearningState(updated);
  window.dispatchEvent(new CustomEvent("cachecourse:favorites-updated"));
  return saved;
}

export async function checkAndSaveFavoriteReminder(now = new Date()) {
  const state = await loadLearningState();
  const result = checkFavoriteReminder(state, now);
  const changed = result.state.favoriteReminderLastAt !== state.favoriteReminderLastAt;
  if (changed) await saveLearningState(result.state);
  return result;
}

export function notifyFavoritesUpdated() {
  window.dispatchEvent(new CustomEvent("cachecourse:favorites-updated"));
}
