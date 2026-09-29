import { LESSONS, OPPORTUNITY } from "./lessons.js";
import { API_SCENARIOS, simulateRequest } from "./api-simulator.js";
import { completeLesson, createInitialState, getNextLesson, getSuggestedRoute, isOpportunityUnlocked, normalizeState, setRoute } from "./logic.js";
import { loadProgress, saveProgress } from "./storage.js";

const $ = (selector) => document.querySelector(selector);
const ui = {
  connection: $("#connection-status"), connectionLabel: $("#connection-label"),
  download: $("#download-button"), downloadLabel: $("#download-button-label"), downloadNote: $("#download-note"),
  lessonList: $("#lesson-list"), completionCount: $("#completion-count"),
  routeTitle: $("#route-title"), routeDescription: $("#route-description"), diagnosticButton: $("#diagnostic-button"),
  routeSelectWrap: $("#route-select-wrap"), routeSelect: $("#route-select"), continueButton: $("#continue-button"),
  progressHeading: $("#progress-heading"), progressNote: $("#progress-note"), progressPercent: $("#progress-percent"),
  ringValue: $("#ring-value"), progressRing: $("#progress-ring"), savedStatus: $("#saved-status"),
  offlineCopy: $("#offline-card-copy"), opportunityCard: $("#opportunity-card"), opportunityLock: $("#opportunity-lock"),
  opportunityTitle: $("#opportunity-title"), opportunityDescription: $("#opportunity-description"),
  opportunityMeta: $("#opportunity-meta"), opportunityLink: $("#opportunity-link"), opportunityFootnote: $("#opportunity-footnote"),
  apiForm: $("#api-form"), apiScenario: $("#api-scenario"), apiMethod: $("#api-method"), apiPath: $("#api-path"),
  apiBody: $("#api-body"), apiBodyHelp: $("#api-body-help"), apiSend: $("#api-send"), apiCode: $("#api-code"),
  apiSource: $("#api-source"), apiStatus: $("#api-status"), apiExplanation: $("#api-explanation"),
  apiResponse: $("#api-response"), apiNotesCount: $("#api-notes-count"), apiNotes: $("#api-notes"),
  apiClearNotes: $("#api-clear-notes"), apiSessionCount: $("#api-session-count"),
  diagnosticDialog: $("#diagnostic-dialog"), lessonDialog: $("#lesson-dialog"), toastRegion: $("#toast-region"), install: $("#install-button")
};

let state = createInitialState();
let installPrompt = null;
let apiRequestCount = 0;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  ui.toastRegion.append(item);
  window.setTimeout(() => item.remove(), 3400);
}

async function persist() {
  const saved = await saveProgress(state);
  ui.savedStatus.textContent = saved ? "Saved on this device" : "Saved for this session";
  return saved;
}

function updateConnection() {
  const offline = !navigator.onLine;
  ui.connection.classList.toggle("offline", offline);
  ui.connection.classList.toggle("saved", !offline && state.packDownloaded);
  ui.connectionLabel.textContent = offline ? "Offline ready" : (state.packDownloaded ? "Pack saved here" : "Connected");
  ui.offlineCopy.textContent = offline
    ? (state.packDownloaded ? "You’re offline. Your downloaded lessons and saved progress are ready on this device." : "You’re offline. Download the lesson pack when you reconnect to prepare for next time.")
    : (state.packDownloaded ? "Your lesson pack is on this device. Open it again when your connection drops." : "Save the lesson pack while you’re connected. It’s just text and quick challenges.");
}

function render() {
  state = normalizeState(state);
  const completeCount = state.completed.length;
  const percentage = Math.round(completeCount / LESSONS.length * 100);
  const next = getNextLesson(state);
  ui.completionCount.textContent = completeCount + " of " + LESSONS.length + " complete";
  ui.progressPercent.textContent = percentage + "%";
  ui.progressRing.setAttribute("aria-label", percentage + " percent complete");
  ui.ringValue.style.strokeDasharray = String(2 * Math.PI * 31);
  ui.ringValue.style.strokeDashoffset = String(2 * Math.PI * 31 * (1 - percentage / 100));
  ui.progressHeading.textContent = percentage === 100 ? "Look how far you’ve come." : (completeCount ? "Steady progress counts." : "A good place to begin.");
  ui.progressNote.textContent = percentage === 100 ? "You finished the FastAPI foundations. Explore your next step when you’re ready." : (completeCount ? "Your next small step is ready whenever you are." : "Download your pack, then choose a route to get started.");
  ui.routeTitle.textContent = state.route === "fast" ? "Fast-track route" : state.route === "beginner" ? "Beginner route" : "Choose your starting point";
  ui.routeDescription.textContent = state.route === "fast"
    ? "Challenge first, then review the source-linked explanation at your own pace."
    : state.route === "beginner" ? "Work through the explanation before trying each short challenge."
    : "Take a quick check or pick the pace that feels right for you.";
  ui.routeSelectWrap.hidden = !state.route;
  ui.diagnosticButton.hidden = Boolean(state.route);
  ui.routeSelect.value = state.route === "fast" ? "fast-track" : "beginner";
  ui.continueButton.textContent = next ? (state.completed.length ? "Continue learning" : "Start learning") : "Review the pathway";

  ui.lessonList.innerHTML = LESSONS.map((lesson, index) => {
    const completed = state.completed.includes(lesson.id);
    const isNext = next && next.id === lesson.id;
    const status = completed ? "Done" : isNext ? "Up next" : "Ahead";
    const disabled = !completed && !isNext;
    return '<div class="lesson-row' + (completed ? ' completed' : '') + (isNext ? ' current' : '') + '">' +
      '<button class="lesson-open" type="button" data-lesson="' + lesson.id + '" aria-label="' + (disabled ? 'Locked: ' : '') + escapeHtml(lesson.title) + '"' + (disabled ? ' disabled' : '') + '>' +
      '<span class="lesson-number">' + (completed ? '✓' : String(index + 1).padStart(2, "0")) + '</span>' +
      '<span class="lesson-body"><span class="lesson-title">' + escapeHtml(lesson.title) + '</span><span class="lesson-description">' + escapeHtml(lesson.subtitle) + '</span></span>' +
      '<span class="lesson-duration">' + escapeHtml(lesson.duration) + '</span><span class="lesson-status">' + status + '</span></button></div>';
  }).join("");

  const unlocked = isOpportunityUnlocked(state);
  ui.opportunityCard.classList.toggle("unlocked", unlocked);
  ui.opportunityLock.textContent = unlocked ? "UNLOCKED" : "LOCKED";
  ui.opportunityTitle.textContent = unlocked ? OPPORTUNITY.title : "Your next step is waiting.";
  ui.opportunityDescription.textContent = unlocked ? OPPORTUNITY.summary : "Complete the five foundations to reveal a locally relevant opportunity to explore.";
  ui.opportunityMeta.textContent = unlocked ? OPPORTUNITY.location + " · Checked " + OPPORTUNITY.checkedAt : "FastAPI foundations · Lagos";
  ui.opportunityLink.hidden = !unlocked;
  ui.opportunityFootnote.textContent = unlocked ? "Availability may change. This milestone is not a job guarantee." : "A learning milestone is a next step, not a job guarantee.";
  ui.download.classList.toggle("is-saved", state.packDownloaded);
  ui.downloadLabel.textContent = state.packDownloaded ? "Lesson pack downloaded" : "Download lesson pack";
  ui.downloadNote.textContent = state.packDownloaded ? "5 lessons · available offline on this device" : "5 lessons · text-first · saves on this device";
  renderPracticeNotes();
  updateConnection();
}

function renderPracticeNotes() {
  const notes = state.practiceNotes || [];
  ui.apiNotesCount.textContent = String(notes.length);
  ui.apiClearNotes.hidden = notes.length === 0;
  if (!notes.length) {
    ui.apiNotes.innerHTML = '<p class="empty-notes">No notes yet. Create one with the POST scenario.</p>';
    return;
  }
  ui.apiNotes.innerHTML = notes.slice().reverse().map((note) =>
    '<div class="practice-note"><span class="practice-note-id">#' + note.id + '</span><span class="practice-note-title">' + escapeHtml(note.title) + '</span><span class="practice-note-state">' + (note.done ? 'DONE' : 'OPEN') + '</span></div>'
  ).join("");
}

function applyApiScenario(key) {
  const scenario = API_SCENARIOS[key] || API_SCENARIOS.learner;
  ui.apiScenario.value = key;
  ui.apiMethod.value = scenario.method;
  ui.apiPath.value = scenario.path;
  ui.apiBody.value = scenario.body;
  ui.apiCode.textContent = scenario.code;
  ui.apiSource.href = scenario.sourceUrl;
  ui.apiSource.textContent = "Open " + scenario.source + " docs ↗";
  ui.apiBodyHelp.textContent = scenario.method === "GET"
    ? "GET reads a resource. Switch to the POST scenario to send a small JSON body."
    : "The Note model expects a non-empty title and an optional boolean done field.";
}

function showApiResponse(result) {
  ui.apiStatus.className = "response-status " + (result.status >= 500 ? "status-error" : result.status >= 400 ? "status-warning" : "status-success");
  ui.apiStatus.textContent = result.status + " · " + result.statusText;
  ui.apiExplanation.textContent = result.explanation;
  ui.apiResponse.textContent = JSON.stringify(result.body, null, 2);
}

async function runApiRequest(event) {
  event.preventDefault();
  const result = simulateRequest({ method: ui.apiMethod.value, path: ui.apiPath.value, body: ui.apiBody.value }, state.practiceNotes);
  apiRequestCount += 1;
  ui.apiSessionCount.textContent = apiRequestCount + (apiRequestCount === 1 ? " request this session" : " requests this session");
  state.practiceNotes = result.notes;
  showApiResponse(result);
  renderPracticeNotes();
  if (result.changed) {
    const saved = await persist();
    if (!saved) {
      ui.apiExplanation.textContent += " The note is available for this session, but browser storage could not save it.";
    }
  }
}

async function clearPracticeNotes() {
  if (!state.practiceNotes.length) return;
  const confirmed = window.confirm("Clear the practice notes saved on this device? Your lesson progress will stay saved.");
  if (!confirmed) return;
  state.practiceNotes = [];
  await persist();
  renderPracticeNotes();
  showApiResponse({
    status: 200,
    statusText: "Practice data cleared",
    body: { items: [], count: 0 },
    explanation: "The local sample database is empty again. Lesson progress was not changed."
  });
}

function questionMarkup(name, label, options) {
  return '<fieldset class="question-block"><legend class="question-label">' + label + '</legend><div class="option-list">' + options.map((option, index) =>
    '<label class="choice-option"><input type="radio" name="' + name + '" value="' + index + '"><span>' + option + '</span></label>'
  ).join("") + '</div></fieldset>';
}

function openDiagnostic() {
  ui.diagnosticDialog.innerHTML = '<div class="modal-content"><div class="modal-header"><div><div class="modal-eyebrow">A quick check · 3 questions</div><h2 id="diagnostic-title">Find a comfortable pace</h2><p class="modal-intro">This suggests a starting route. It is not a grade, and you can change pace any time.</p></div><button class="close-button" type="button" data-close aria-label="Close">×</button></div>' +
    '<form id="diagnostic-form">' +
    questionMarkup("q1", "1. Which HTTP method is commonly used to retrieve a resource?", ["GET", "POST", "PATCH"]) +
    questionMarkup("q2", "2. In Python, what type is the value 12?", ["str", "int", "bool"]) +
    questionMarkup("q3", "3. What does JSON help an API do?", ["Style a webpage", "Exchange structured data", "Compile Python code"]) +
    '<div class="form-error" id="diagnostic-error" role="alert"></div><div class="modal-actions"><button class="button button-quiet" type="button" data-close>Maybe later</button><button class="button button-primary" type="submit">See my route <span aria-hidden="true">→</span></button></div></form></div>';
  ui.diagnosticDialog.showModal();
  ui.diagnosticDialog.querySelector("[data-close]").focus();
  ui.diagnosticDialog.querySelector("#diagnostic-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (["q1", "q2", "q3"].some((key) => form.get(key) === null)) {
      ui.diagnosticDialog.querySelector("#diagnostic-error").textContent = "Choose an answer for each question, or close this check and select a route yourself.";
      return;
    }
    const answers = [form.get("q1") === "0", form.get("q2") === "1", form.get("q3") === "1"];
    const suggested = getSuggestedRoute(answers);
    state = setRoute(state, suggested);
    state.diagnosticDone = true;
    render();
    persist();
    ui.diagnosticDialog.close();
    toast(suggested === "fast" ? "Fast-track suggested. You can switch pace at any time." : "Beginner route suggested. You can switch pace at any time.");
  });
}

function renderChallenge(lesson, fastFirst) {
  const options = lesson.options.map((option) =>
    '<label class="choice-option"><input type="radio" name="lesson-answer" value="' + option.id + '"><span>' + escapeHtml(option.text) + '</span></label>'
  ).join("");
  return '<section class="lesson-challenge"><h3>Try it yourself</h3><p>' + escapeHtml(lesson.challenge) + '</p><form class="challenge-form"><div class="option-list">' + options + '</div><div class="challenge-feedback" hidden></div><div class="refresh-note" hidden></div><div class="modal-actions"><span class="form-error" role="status"></span><button class="button button-primary challenge-submit" type="submit">Check answer</button></div></form></section>';
}

function openLesson(lesson) {
  const fastFirst = state.route === "fast";
  const content = '<div class="lesson-meta"><span class="meta-chip">' + escapeHtml(lesson.level) + '</span><span class="meta-chip">' + escapeHtml(lesson.duration) + '</span><span class="meta-chip">' + (fastFirst ? 'Challenge first' : 'Read, then practise') + '</span></div>' +
    '<p class="lesson-intro">' + escapeHtml(lesson.intro) + '</p>' +
    '<div class="lesson-concept"><h3>' + escapeHtml(lesson.conceptHeading) + '</h3><p>' + escapeHtml(lesson.concept) + '</p></div>' +
    '<pre class="lesson-code-block"><code>' + escapeHtml(lesson.code) + '</code></pre>' +
    '<div class="lesson-source"><span>Source: ' + escapeHtml(lesson.source) + ' · ' + escapeHtml(lesson.sourceLicense) + ' · checked ' + escapeHtml(lesson.sourceCheckedAt) + ' · original summary</span><span class="source-links"><a href="' + escapeHtml(lesson.sourceUrl) + '" target="_blank" rel="noreferrer">Docs ↗</a><a href="' + escapeHtml(lesson.sourceLicenseUrl) + '" target="_blank" rel="noreferrer">License ↗</a></span></div>';
  const challenge = renderChallenge(lesson, fastFirst);
  ui.lessonDialog.innerHTML = '<div class="modal-content"><div class="modal-header"><div><div class="modal-eyebrow">Lesson ' + String(LESSONS.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0") + ' · FastAPI foundations</div><h2 id="lesson-dialog-title">' + escapeHtml(lesson.title) + '</h2></div><button class="close-button" type="button" data-close aria-label="Close lesson">×</button></div>' +
    (fastFirst ? challenge + content : content + challenge) +
    '<div class="modal-actions"><span class="route-hint">' + (fastFirst ? 'Fast-track: use the challenge to find what you know.' : 'Beginner: take your time with the example.') + '</span><button class="button button-quiet" type="button" data-close>Close lesson</button></div></div>';
  ui.lessonDialog.showModal();
  ui.lessonDialog.querySelector("[data-close]").focus();
  ui.lessonDialog.querySelector(".challenge-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const selected = new FormData(form).get("lesson-answer");
    const feedback = form.querySelector(".challenge-feedback");
    const refresher = form.querySelector(".refresh-note");
    const error = form.querySelector(".form-error");
    if (!selected) { error.textContent = "Choose an answer first."; return; }
    error.textContent = "";
    if (selected !== lesson.answerId) {
      feedback.className = "challenge-feedback incorrect";
      feedback.textContent = lesson.feedback;
      feedback.hidden = false;
      refresher.textContent = "Quick refresher: " + lesson.refresher;
      refresher.hidden = false;
      return;
    }
    feedback.className = "challenge-feedback correct";
    feedback.textContent = "That’s right. This lesson is now saved as complete on this device.";
    feedback.hidden = false;
    refresher.hidden = true;
    form.querySelectorAll("input").forEach((input) => { input.disabled = true; });
    form.querySelector(".challenge-submit").disabled = true;
    state = completeLesson(state, lesson.id, selected);
    const durable = await persist();
    render();
    if (!durable) toast("Saved for this session. Browser storage was unavailable.");
    else if (isOpportunityUnlocked(state)) toast("Pathway complete. Your source-linked next step is unlocked.");
    else toast("Progress saved. Your next lesson is ready.");
  });
}

async function downloadPack() {
  if (!navigator.serviceWorker) { toast("This browser does not support offline downloads."); return; }
  ui.download.disabled = true;
  ui.downloadLabel.textContent = "Saving lesson pack…";
  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller || registration.active || registration.waiting || registration.installing;
    if (!worker) throw new Error("Offline support is still starting. Please try again in a moment.");
    const channel = new MessageChannel();
    const reply = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Offline save timed out")), 8000);
      channel.port1.onmessage = (event) => { window.clearTimeout(timeout); resolve(event.data); };
    });
    worker.postMessage({ type: "DOWNLOAD_LESSON_PACK", lessons: LESSONS }, [channel.port2]);
    const result = await reply;
    if (!result.ok) throw new Error(result.message || "Could not save the lesson pack");
    state.packDownloaded = true;
    await persist();
    render();
    const packSize = new Blob([JSON.stringify(LESSONS)]).size;
    toast("Lesson pack saved · " + (packSize / 1024).toFixed(1) + " KB of text and challenges.");
  } catch (error) {
    toast(error.message || "Could not save the lesson pack. Please retry while connected.");
    ui.downloadLabel.textContent = state.packDownloaded ? "Lesson pack downloaded" : "Download lesson pack";
  } finally {
    ui.download.disabled = false;
  }
}

function wireEvents() {
  ui.download.addEventListener("click", downloadPack);
  ui.diagnosticButton.addEventListener("click", openDiagnostic);
  ui.routeSelect.addEventListener("change", async () => {
    state = setRoute(state, ui.routeSelect.value === "fast-track" ? "fast" : "beginner");
    render();
    await persist();
    toast("Route updated. Your completed lessons stay saved.");
  });
  ui.continueButton.addEventListener("click", () => {
    const next = getNextLesson(state);
    if (next) openLesson(next);
    else openLesson(LESSONS[LESSONS.length - 1]);
  });
  ui.apiScenario.addEventListener("change", () => applyApiScenario(ui.apiScenario.value));
  ui.apiMethod.addEventListener("change", () => {
    ui.apiBodyHelp.textContent = ui.apiMethod.value === "GET"
      ? "GET reads a resource. Choose POST /notes to send a small JSON body."
      : "The Note model expects a non-empty title and an optional boolean done field.";
  });
  ui.apiForm.addEventListener("submit", runApiRequest);
  ui.apiClearNotes.addEventListener("click", clearPracticeNotes);
  ui.lessonList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lesson]");
    if (!button || button.disabled) return;
    const lesson = LESSONS.find((item) => item.id === button.dataset.lesson);
    if (lesson) openLesson(lesson);
  });
  [ui.diagnosticDialog, ui.lessonDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    ui.install.hidden = false;
  });
  ui.install.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    ui.install.hidden = true;
  });
}

async function start() {
  state = normalizeState(await loadProgress(createInitialState()));
  applyApiScenario("learner");
  render();
  wireEvents();
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener("controllerchange", updateConnection, { once: true });
      }
    } catch {
      toast("Offline caching could not start here. Try localhost or HTTPS.");
    }
  }
}

start();
