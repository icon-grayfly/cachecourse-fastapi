import { LESSONS } from "./lessons.js";
import { getCourse, getCourseSchedule } from "./catalog.js";
import { answerCompilerQuestion, completeLesson, createInitialState, normalizeState } from "./logic.js";
import { loadProgress, saveProgress } from "./storage.js";

const $ = (selector) => document.querySelector(selector);
const courseId = new URLSearchParams(window.location.search).get("course");
const course = getCourse(courseId);
const outline = $("#course-outline");
const content = $("#course-learning-content");
const viewButtons = [...document.querySelectorAll(".schedule-view")];
let selectedView = "weeks";
let selectedKey = new URLSearchParams(window.location.search).get("module");
let learnerState = createInitialState();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function allItems(schedule = getCourseSchedule(course.id, selectedView)) {
  return schedule.flatMap((group) => group.items);
}

function findItem(moduleKey) {
  return allItems().find((item) => item.moduleKey === moduleKey) || null;
}

function completionFor(item) {
  if (item.lessonId) return learnerState.completed.includes(item.lessonId);
  return item.moduleKey === "csc408:tokens" && learnerState.compilerModuleCompleted;
}

function firstModuleKey() {
  const items = allItems();
  return items.find((item) => item.lessonId || item.moduleKey === "csc408:tokens")?.moduleKey || items[0]?.moduleKey || null;
}

function sectionKey(group) {
  return "section:" + group.title;
}

function syncModuleUrl() {
  const url = new URL(window.location.href);
  if (selectedKey) url.searchParams.set("module", selectedKey);
  else url.searchParams.delete("module");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

function selectKey(key, shouldScroll = true) {
  selectedKey = key;
  syncModuleUrl();
  renderOutline();
  renderSelectedContent();
  if (shouldScroll && window.matchMedia("(max-width: 720px)").matches) {
    content.scrollIntoView({ block: "start" });
  }
}

function renderMissingCourse() {
  $("#course-page").innerHTML = '<section class="course-missing"><div class="section-kicker">LEARNING HUB</div><h1>That course is not here yet.</h1><p>Choose an available learning space from the course catalogue.</p><a class="button button-primary" href="/learning-hub.html">Browse learning spaces <span aria-hidden="true">→</span></a></section>';
}

function renderOutline() {
  const schedule = getCourseSchedule(course.id, selectedView);
  outline.innerHTML = schedule.map((group) => {
    const groupSelected = selectedKey === sectionKey(group);
    const items = group.items.map((item) => {
      const selected = selectedKey === item.moduleKey;
      const complete = completionFor(item);
      const status = complete ? "Complete" : item.lessonId || item.moduleKey === "csc408:tokens" ? "Practice" : "Reading";
      return '<button class="outline-module' + (selected ? ' is-selected' : '') + (complete ? ' is-complete' : '') + '" type="button" data-module-key="' + escapeHtml(item.moduleKey) + '" aria-pressed="' + String(selected) + '">' +
        '<span class="outline-module-state" aria-hidden="true">' + (complete ? '✓' : item.lessonId || item.moduleKey === "csc408:tokens" ? '○' : '·') + '</span>' +
        '<span class="outline-module-copy"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.duration) + ' · ' + status + '</span></span></button>';
    }).join("");
    return '<section class="outline-section' + (groupSelected ? ' is-current' : '') + '"><button class="outline-section-button" type="button" data-section-key="' + escapeHtml(sectionKey(group)) + '" aria-pressed="' + String(groupSelected) + '"><span class="outline-section-chevron" aria-hidden="true">' + (groupSelected ? '⌄' : '›') + '</span><span><strong>' + escapeHtml(group.title) + '</strong><small>' + escapeHtml(group.subtitle) + '</small></span></button><div class="outline-module-list">' + items + '</div></section>';
  }).join("");
}

function renderSection(group) {
  const items = group.items.map((item) => '<li><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span><small>' + escapeHtml(item.type) + ' · ' + escapeHtml(item.duration) + '</small></li>').join("");
  content.innerHTML = '<div class="course-content-heading"><div class="course-content-eyebrow">COURSE SECTION</div><h2 id="learning-content-title">' + escapeHtml(group.title) + '</h2><p>' + escapeHtml(group.subtitle) + '</p></div><div class="section-overview"><div class="section-overview-icon" aria-hidden="true">▤</div><div><h3>In this section</h3><p>Choose a module in the course outline to open its lesson or reading details here.</p></div></div><ul class="section-item-list">' + items + '</ul>';
}

function renderSourceReference(item) {
  content.innerHTML = '<div class="course-content-heading"><div class="course-content-eyebrow">SOURCE READING · NOT AN INTERACTIVE MODULE</div><h2 id="learning-content-title">' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.detail) + '</p></div><div class="source-reading-card"><div class="source-reading-mark" aria-hidden="true">PDF</div><div><div class="section-kicker">MIVA OPEN UNIVERSITY · CSC 408</div><h3>Continue with your supplied course summary</h3><p>This course companion does not include or redistribute the PDF. Open your own copy and go to <strong>' + escapeHtml(item.duration) + '</strong>. Interactive lessons will appear here as they are created and checked against the source.</p><p class="source-reading-license">Reuse terms are not stated in the supplied document. CacheCourse uses original explanations and does not reproduce its slides or passages.</p></div></div>';
}

function renderQuestion(options, selected, completed) {
  return '<fieldset class="course-question-options"><legend class="sr-only">Choose an answer</legend>' + options.map((option, index) => {
    const id = "course-answer-" + index;
    return '<label for="' + id + '" class="course-answer-option' + (selected === option.id ? ' is-checked' : '') + '"><input id="' + id + '" type="radio" name="course-answer" value="' + escapeHtml(option.id) + '"' + (selected === option.id ? ' checked' : '') + (completed ? ' disabled' : '') + '><span>' + escapeHtml(option.text) + '</span></label>';
  }).join("") + '</fieldset>';
}

function renderFastApiLesson(item) {
  const lesson = LESSONS.find((entry) => entry.id === item.lessonId);
  if (!lesson) return;
  const completed = learnerState.completed.includes(lesson.id);
  const savedAnswer = learnerState.answers[lesson.id] || "";
  const lessonNumber = String(LESSONS.indexOf(lesson) + 1).padStart(2, "0");
  content.innerHTML = '<div class="course-content-heading"><div class="course-content-eyebrow">FASTAPI FOUNDATIONS · MODULE ' + lessonNumber + ' · ' + escapeHtml(lesson.duration) + '</div><h2 id="learning-content-title">' + escapeHtml(lesson.title) + '</h2><p>' + escapeHtml(lesson.subtitle) + '</p><div class="course-module-chips"><span>' + escapeHtml(lesson.level) + '</span><span>Offline practice</span>' + (completed ? '<span class="completed-chip">Completed on this device</span>' : '') + '</div></div>' +
    '<div class="course-lesson-body"><p class="course-lesson-intro">' + escapeHtml(lesson.intro) + '</p><section class="course-concept"><div class="section-kicker">THE IDEA</div><h3>' + escapeHtml(lesson.conceptHeading) + '</h3><p>' + escapeHtml(lesson.concept) + '</p></section>' +
    '<div class="course-code-heading">A small FastAPI example</div><pre class="course-code-block"><code>' + escapeHtml(lesson.code) + '</code></pre>' +
    '<section class="course-challenge"><div class="course-content-eyebrow">PRACTISE · ' + escapeHtml(lesson.duration) + '</div><h3>Try it yourself</h3><p>' + escapeHtml(lesson.challenge) + '</p><form class="course-quiz" data-lesson-id="' + escapeHtml(lesson.id) + '">' + renderQuestion(lesson.options, savedAnswer, completed) + '<div class="course-quiz-feedback" role="status" aria-live="polite" hidden></div><div class="course-quiz-actions"><span class="course-quiz-save">Answers stay on this device.</span><button class="button button-primary" type="submit"' + (completed ? ' disabled' : '') + '>' + (completed ? 'Completed' : 'Check answer') + '</button></div></form></section>' +
    '<div class="course-lesson-source"><div><span>REFERENCE · ' + escapeHtml(lesson.source) + '</span><span>' + escapeHtml(lesson.sourceLicense) + ' · checked ' + escapeHtml(lesson.sourceCheckedAt) + '</span></div><a href="' + escapeHtml(lesson.sourceUrl) + '" target="_blank" rel="noreferrer">Open official reference ↗</a></div></div>';
  bindFastApiQuiz(lesson);
}

function bindFastApiQuiz(lesson) {
  const form = content.querySelector(".course-quiz");
  const feedback = form?.querySelector(".course-quiz-feedback");
  if (!form || !feedback) return;
  form.addEventListener("change", (event) => {
    if (event.target.matches("input[type=radio]")) {
      form.querySelectorAll(".course-answer-option").forEach((label) => label.classList.toggle("is-checked", label.contains(event.target)));
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = form.querySelector("input[name=course-answer]:checked")?.value;
    feedback.hidden = false;
    feedback.classList.toggle("is-correct", selected === lesson.answerId);
    if (!selected) {
      feedback.textContent = "Choose an answer to continue.";
      return;
    }
    if (selected === lesson.answerId) {
      learnerState = completeLesson(learnerState, lesson.id, selected);
      const saved = await saveProgress(learnerState);
      feedback.textContent = "Correct. " + lesson.feedback + " " + (saved ? "Completed and saved on this device." : "Completed for this session on this device.");
      form.querySelectorAll("input").forEach((input) => { input.disabled = true; });
      const submit = form.querySelector("button[type=submit]");
      submit.textContent = "Completed";
      submit.disabled = true;
      form.querySelector(".course-quiz-save").textContent = "Progress stays on this device.";
      form.querySelectorAll(".course-answer-option").forEach((label) => label.classList.toggle("is-checked", label.contains(form.querySelector("input:checked"))));
      renderOutline();
    } else {
      feedback.textContent = lesson.feedback + " " + lesson.refresher;
    }
  });
}

function renderCompilerLesson() {
  const completed = learnerState.compilerModuleCompleted;
  const selected = learnerState.compilerModuleAnswer;
  content.innerHTML = '<div class="course-content-heading"><div class="course-content-eyebrow">CSC 408 · WEEKS 1–4 · 6 MIN</div><h2 id="learning-content-title">How source code becomes tokens</h2><p>A short sample on lexical analysis, based on page 2 of the supplied course summary.</p><div class="course-module-chips"><span>Interactive sample</span><span>Offline practice</span>' + (completed ? '<span class="completed-chip">Completed on this device</span>' : '') + '</div></div>' +
    '<div class="course-lesson-body"><p class="course-lesson-intro">A compiler’s lexical-analysis stage scans a source line from left to right. It groups characters into tokens—such as identifiers, operators, and number literals—so later stages can reason about the program’s structure.</p><section class="course-concept"><div class="section-kicker">THE IDEA</div><h3>First, group characters into meaningful pieces</h3><p>Tokenizing finds the pieces. Syntax analysis checks whether those pieces fit the language’s grammar.</p></section><div class="course-code-heading">A tiny line of code</div><pre class="course-code-block"><code>total = total + 1</code></pre><ol class="course-token-list"><li><code>total</code><span>identifier · a name in the program</span></li><li><code>=</code><span>assignment operator · gives the name a value</span></li><li><code>total</code><span>identifier · the existing value is read</span></li><li><code>+</code><span>operator · combines values by addition</span></li><li><code>1</code><span>integer literal · a number written directly</span></li></ol>' +
    '<section class="course-challenge"><div class="course-content-eyebrow">QUICK CHECK</div><h3>Name the token</h3><p>In <code>total = total + 1</code>, what kind of token is <code>+</code>?</p><form class="course-compiler-quiz"><fieldset class="course-question-options"><legend class="sr-only">Choose the token type</legend><label for="compiler-identifier" class="course-answer-option' + (selected === "identifier" ? ' is-checked' : '') + '"><input id="compiler-identifier" type="radio" name="course-compiler-answer" value="identifier"' + (selected === "identifier" ? ' checked' : '') + (completed ? ' disabled' : '') + '><span>Identifier</span></label><label for="compiler-operator" class="course-answer-option' + (selected === "operator" ? ' is-checked' : '') + '"><input id="compiler-operator" type="radio" name="course-compiler-answer" value="operator"' + (selected === "operator" ? ' checked' : '') + (completed ? ' disabled' : '') + '><span>Operator</span></label><label for="compiler-keyword" class="course-answer-option' + (selected === "keyword" ? ' is-checked' : '') + '"><input id="compiler-keyword" type="radio" name="course-compiler-answer" value="keyword"' + (selected === "keyword" ? ' checked' : '') + (completed ? ' disabled' : '') + '><span>Keyword</span></label></fieldset><div class="course-quiz-feedback' + (completed ? ' is-correct' : '') + '" role="status" aria-live="polite"' + (selected ? '' : ' hidden') + '>' + escapeHtml(completed ? "Correct. The plus sign is an operator token. Completed and saved on this device." : selected ? "Not quite. Token type describes a symbol’s role in the code. Try again." : "") + '</div><div class="course-quiz-actions"><span class="course-quiz-save">Answers stay on this device.</span><button class="button button-primary" type="submit"' + (completed ? ' disabled' : '') + '>' + (completed ? 'Completed' : 'Check answer') + '</button></div></form></section>' +
    '<div class="course-lesson-source"><div><span>REFERENCE · MIVA CSC 408 Full Course Summary · Weeks 1–4, page 2</span><span>Original explanation and example · reuse license not stated in supplied document</span></div><a href="/sources.html">View source notes →</a></div></div>';
  bindCompilerQuiz();
}

function bindCompilerQuiz() {
  const form = content.querySelector(".course-compiler-quiz");
  if (!form) return;
  form.addEventListener("change", (event) => {
    if (event.target.matches("input[type=radio]")) {
      form.querySelectorAll(".course-answer-option").forEach((label) => label.classList.toggle("is-checked", label.contains(event.target)));
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = form.querySelector("input[name=course-compiler-answer]:checked")?.value;
    const feedback = form.querySelector(".course-quiz-feedback");
    feedback.hidden = false;
    learnerState = answerCompilerQuestion(learnerState, selected);
    if (selected === "operator") {
      const saved = await saveProgress(learnerState);
      feedback.classList.add("is-correct");
      feedback.textContent = "Correct. The plus sign is an operator token. " + (saved ? "Completed and saved on this device." : "Completed for this session on this device.");
      form.querySelectorAll("input").forEach((input) => { input.disabled = true; });
      const submit = form.querySelector("button[type=submit]");
      submit.textContent = "Completed";
      submit.disabled = true;
      form.querySelectorAll(".course-answer-option").forEach((label) => label.classList.toggle("is-checked", label.contains(form.querySelector("input:checked"))));
      renderOutline();
    } else if (!selected) {
      feedback.textContent = "Choose an answer to continue.";
    } else {
      await saveProgress(learnerState);
      feedback.textContent = "Not quite. Token type describes a symbol’s role in the code. Try again.";
    }
  });
}

function renderSelectedContent() {
  const group = getCourseSchedule(course.id, selectedView).find((entry) => sectionKey(entry) === selectedKey);
  if (group) {
    renderSection(group);
    return;
  }
  const item = findItem(selectedKey);
  if (!item) {
    selectedKey = firstModuleKey();
    syncModuleUrl();
    renderOutline();
    renderSelectedContent();
    return;
  }
  if (item.lessonId) {
    renderFastApiLesson(item);
  } else if (item.moduleKey === "csc408:tokens") {
    renderCompilerLesson();
  } else {
    renderSourceReference(item);
  }
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
  const nextLesson = LESSONS.find((lesson) => !learnerState.completed.includes(lesson.id));
  const actionHref = course.id === "fastapi"
    ? "/course.html?course=fastapi&module=lesson%3A" + encodeURIComponent(nextLesson?.id || LESSONS[0].id) + "#course-workspace"
    : "/course.html?course=csc408&module=csc408%3Atokens#course-workspace";
  $("#course-actions").innerHTML = '<a class="button button-primary" href="' + actionHref + '">' + (course.id === "fastapi" && learnerState.completed.length ? "Continue learning" : "Start learning") + ' <span aria-hidden="true">→</span></a>' + (course.id === "fastapi" ? '<a class="course-secondary-link" href="/api-studio.html">Go to API Studio <span aria-hidden="true">↗</span></a>' : '<span class="course-action-note">1 short module ready</span>');
  $("#course-source-note").innerHTML = '<div class="course-source-icon" aria-hidden="true">↳</div><div><div class="section-kicker">SOURCE & CONTENT STATUS</div><p><strong>' + escapeHtml(course.sourceNote) + '</strong> ' + (course.id === "csc408" ? "The interactive sample uses an original explanation and exercise. The document's reuse license is not stated; other sections remain source-reading references." : "Original lesson summaries link to official FastAPI documentation. Each reference and license note appears with its lesson.") + '</p></div><a href="/sources.html">Review source notes <span aria-hidden="true">→</span></a>';
  $("#outline-description").textContent = selectedView === "weeks" ? "Browse the course section by section." : "Choose a focused block for your study time.";
  const firstValidKey = firstModuleKey();
  if (!selectedKey || (!findItem(selectedKey) && !getCourseSchedule(course.id, selectedView).some((group) => sectionKey(group) === selectedKey))) selectedKey = firstValidKey;
  renderOutline();
  renderSelectedContent();
}

if (!course) {
  renderMissingCourse();
} else {
  viewButtons.forEach((button) => button.addEventListener("click", () => {
    selectedView = button.dataset.view;
    $("#outline-description").textContent = selectedView === "weeks" ? "Browse the course section by section." : "Choose a focused block for your study time.";
    if (!findItem(selectedKey) && !getCourseSchedule(course.id, selectedView).some((group) => sectionKey(group) === selectedKey)) selectedKey = firstModuleKey();
    renderOutline();
    renderSelectedContent();
    syncModuleUrl();
  }));
  outline.addEventListener("click", (event) => {
    const moduleButton = event.target.closest("[data-module-key]");
    const sectionButton = event.target.closest("[data-section-key]");
    if (moduleButton) selectKey(moduleButton.dataset.moduleKey);
    else if (sectionButton) selectKey(sectionButton.dataset.sectionKey);
  });
  loadProgress(createInitialState()).then((saved) => {
    learnerState = normalizeState(saved);
    renderCourse();
  });
}
