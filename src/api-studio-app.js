import { API_SCENARIOS, simulateRequest } from "./api-simulator.js";
import { createInitialState, normalizeState } from "./logic.js";
import { loadProgress, saveProgress } from "./storage.js";

const $ = (selector) => document.querySelector(selector);
const ui = {
  form: $("#api-form"), scenario: $("#api-scenario"), method: $("#api-method"), path: $("#api-path"),
  body: $("#api-body"), bodyHelp: $("#api-body-help"), code: $("#api-code"), source: $("#api-source"),
  status: $("#api-status"), explanation: $("#api-explanation"), response: $("#api-response"),
  notesCount: $("#api-notes-count"), notes: $("#api-notes"), clearNotes: $("#api-clear-notes"),
  sessionCount: $("#api-session-count")
};

let state = createInitialState();
let requestCount = 0;

function renderNotes() {
  const notes = state.practiceNotes;
  ui.notesCount.textContent = String(notes.length);
  ui.clearNotes.hidden = notes.length === 0;
  if (!notes.length) {
    ui.notes.innerHTML = '<p class="empty-notes">No notes yet. Create one with the POST scenario.</p>';
    return;
  }
  ui.notes.innerHTML = notes.slice().reverse().map((note) =>
    '<div class="practice-note"><span class="practice-note-id">#' + note.id + '</span><span class="practice-note-title">' + escapeHtml(note.title) + '</span><span class="practice-note-state">' + (note.done ? 'DONE' : 'OPEN') + '</span></div>'
  ).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function applyScenario(key) {
  const scenario = API_SCENARIOS[key] || API_SCENARIOS.learner;
  ui.scenario.value = key;
  ui.method.value = scenario.method;
  ui.path.value = scenario.path;
  ui.body.value = scenario.body;
  ui.code.textContent = scenario.code;
  ui.source.href = scenario.sourceUrl;
  ui.source.textContent = "Open " + scenario.source + " docs ↗";
  ui.bodyHelp.textContent = scenario.method === "GET"
    ? "GET reads a resource. Switch to the POST scenario to send a small JSON body."
    : "The Note model expects a non-empty title and an optional boolean done field.";
}

function showResponse(result) {
  ui.status.className = "response-status " + (result.status >= 500 ? "status-error" : result.status >= 400 ? "status-warning" : "status-success");
  ui.status.textContent = result.status + " · " + result.statusText;
  ui.explanation.textContent = result.explanation;
  ui.response.textContent = JSON.stringify(result.body, null, 2);
}

async function runRequest(event) {
  event.preventDefault();
  const result = simulateRequest({ method: ui.method.value, path: ui.path.value, body: ui.body.value }, state.practiceNotes);
  requestCount += 1;
  ui.sessionCount.textContent = requestCount + (requestCount === 1 ? " request this session" : " requests this session");
  state.practiceNotes = result.notes;
  showResponse(result);
  renderNotes();
  if (result.changed && !await saveProgress(state)) {
    ui.explanation.textContent += " The note is available for this session, but browser storage could not save it.";
  }
}

async function clearNotes() {
  if (!state.practiceNotes.length) return;
  if (!window.confirm("Clear the practice notes saved on this device? Your lesson progress will stay saved.")) return;
  state.practiceNotes = [];
  await saveProgress(state);
  renderNotes();
  showResponse({
    status: 200,
    statusText: "Practice data cleared",
    body: { items: [], count: 0 },
    explanation: "The local sample database is empty again. Lesson progress was not changed."
  });
}

async function start() {
  state = normalizeState(await loadProgress(createInitialState()));
  applyScenario("learner");
  renderNotes();
  ui.scenario.addEventListener("change", () => applyScenario(ui.scenario.value));
  ui.method.addEventListener("change", () => {
    ui.bodyHelp.textContent = ui.method.value === "GET"
      ? "GET reads a resource. Choose POST /notes to send a small JSON body."
      : "The Note model expects a non-empty title and an optional boolean done field.";
  });
  ui.form.addEventListener("submit", runRequest);
  ui.clearNotes.addEventListener("click", clearNotes);
}

start();
