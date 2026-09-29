import test from "node:test";
import assert from "node:assert/strict";
import { LESSONS } from "../src/lessons.js";
import { COURSES, getCourse, getCourseSchedule } from "../src/catalog.js";
import { simulateRequest } from "../src/api-simulator.js";
import { answerCompilerQuestion, completeLesson, createInitialState, getNextLesson, getSuggestedRoute, isOpportunityUnlocked, normalizeState, setRoute } from "../src/logic.js";

test("diagnostic routes learners by correct answers without blocking manual choice", () => {
  assert.equal(getSuggestedRoute([true, true, false]), "fast");
  assert.equal(getSuggestedRoute([true, false, false]), "beginner");
  assert.equal(setRoute(createInitialState(), "fast").route, "fast");
});

test("route changes preserve completed lesson progress", () => {
  let state = completeLesson(createInitialState(), LESSONS[0].id, LESSONS[0].answerId);
  state = setRoute(state, "beginner");
  assert.deepEqual(state.completed, [LESSONS[0].id]);
  assert.equal(getNextLesson(state).id, LESSONS[1].id);
});

test("completion is idempotent and records an answer", () => {
  let state = completeLesson(createInitialState(), LESSONS[0].id, "b");
  state = completeLesson(state, LESSONS[0].id, "b");
  assert.equal(state.completed.length, 1);
  assert.equal(state.answers[LESSONS[0].id], "b");
});

test("opportunity remains locked until all path lessons are complete", () => {
  let state = createInitialState();
  assert.equal(isOpportunityUnlocked(state), false);
  for (const lesson of LESSONS) state = completeLesson(state, lesson.id, lesson.answerId);
  assert.equal(isOpportunityUnlocked(state), true);
  assert.equal(getNextLesson(state), null);
});

test("stored state is sanitized to known lesson IDs and supported routes", () => {
  const state = normalizeState({ route: "unknown", completed: [LESSONS[0].id, "fake"], answers: null, diagnosticDone: true });
  assert.equal(state.route, null);
  assert.deepEqual(state.completed, [LESSONS[0].id]);
  assert.deepEqual(state.answers, {});
});

test("every lesson has a source, license reference, and answer that matches an option", () => {
  for (const lesson of LESSONS) {
    assert.match(lesson.sourceUrl, /^https:\/\//);
    assert.match(lesson.sourceLicenseUrl, /^https:\/\//);
    assert.match(lesson.sourceLicense, /MIT/);
    assert.ok(lesson.sourceCheckedAt);
    assert.ok(lesson.options.some((option) => option.id === lesson.answerId));
  }
});

test("API Studio parses valid path parameters and returns explanatory errors", () => {
  const found = simulateRequest({ method: "GET", path: "/learners/42" }, []);
  const invalid = simulateRequest({ method: "GET", path: "/learners/nope" }, []);
  const missing = simulateRequest({ method: "GET", path: "/learners/88" }, []);
  assert.equal(found.status, 200);
  assert.equal(found.body.id, 42);
  assert.equal(invalid.status, 422);
  assert.equal(missing.status, 404);
});

test("API Studio validates JSON and creates notes with a 201 response", () => {
  const malformed = simulateRequest({ method: "POST", path: "/notes", body: "{" }, []);
  const missingTitle = simulateRequest({ method: "POST", path: "/notes", body: '{"done":false}' }, []);
  const created = simulateRequest({ method: "POST", path: "/notes", body: '{"title":"Practice routes"}' }, []);
  assert.equal(malformed.status, 422);
  assert.equal(missingTitle.status, 422);
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, { id: 1, title: "Practice routes", done: false });
  assert.equal(created.changed, true);
});

test("API Studio reads locally saved notes without mutating the input list", () => {
  const saved = [{ id: 3, title: "Review status codes", done: true }];
  const result = simulateRequest({ method: "GET", path: "/notes" }, saved);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.items, saved);
  assert.deepEqual(saved, [{ id: 3, title: "Review status codes", done: true }]);
});

test("API Studio distinguishes unsupported methods and unknown routes", () => {
  assert.equal(simulateRequest({ method: "DELETE", path: "/notes" }, []).status, 405);
  assert.equal(simulateRequest({ method: "GET", path: "/missing" }, []).status, 404);
});

test("practice note storage is normalized and bounded", () => {
  const state = normalizeState({ practiceNotes: [{ id: 1, title: "  Local only  ", done: false }, { id: "2", title: "bad id", done: false }] });
  assert.deepEqual(state.practiceNotes, [{ id: 1, title: "Local only", done: false }]);
});

test("the CSC 408 sample lesson saves correct completion without changing the FastAPI path", () => {
  const initial = createInitialState();
  const incorrect = answerCompilerQuestion(initial, "identifier");
  assert.equal(incorrect.compilerModuleCompleted, false);
  const completed = answerCompilerQuestion(incorrect, "operator");
  assert.equal(completed.compilerModuleCompleted, true);
  assert.equal(completed.compilerModuleAnswer, "operator");
  assert.equal(completed.completed.length, 0);
  assert.equal(normalizeState(completed).compilerModuleCompleted, true);
});

test("compiler sample completion cannot be introduced or revoked by invalid saved answers", () => {
  assert.equal(normalizeState({ compilerModuleCompleted: true, compilerModuleAnswer: "identifier" }).compilerModuleCompleted, false);
  const completed = answerCompilerQuestion(createInitialState(), "operator");
  const unchanged = answerCompilerQuestion(completed, "keyword");
  assert.equal(unchanged.compilerModuleCompleted, true);
  assert.equal(unchanged.compilerModuleAnswer, "operator");
});

test("Learning Hub exposes real courses under distinct departments", () => {
  assert.equal(getCourse("csc408").department, "Computer Science");
  assert.equal(getCourse("fastapi").department, "Software Engineering");
  assert.equal(getCourse("unknown"), null);
  assert.equal(COURSES.length, 2);
});

test("FastAPI week and study-session views include every lesson once and in order", () => {
  const expected = LESSONS.map((lesson) => lesson.title);
  for (const view of ["weeks", "sessions"]) {
    const actual = getCourseSchedule("fastapi", view).flatMap((group) => group.items.map((item) => item.title));
    assert.deepEqual(actual, expected);
  }
  assert.ok(getCourseSchedule("fastapi", "sessions").every((group) => group.subtitle.includes("1-hour block")));
});

test("CSC 408 schedule distinguishes one interactive sample from unbuilt source-reading sections", () => {
  const interactive = getCourseSchedule("csc408", "weeks").flatMap((group) => group.items).filter((item) => item.moduleKey === "csc408:tokens");
  const sourceReading = getCourseSchedule("csc408", "weeks").flatMap((group) => group.items).filter((item) => item.moduleKey !== "csc408:tokens");
  assert.equal(interactive.length, 1);
  assert.equal(interactive[0].title, "How source code becomes tokens");
  assert.equal(sourceReading.length, 3);
  assert.equal(getCourseSchedule("csc408", "invalid").length, 0);
});

test("course outline module identifiers are stable between week and study-session views", () => {
  for (const course of COURSES) {
    const keysByView = ["weeks", "sessions"].map((view) => getCourseSchedule(course.id, view).flatMap((group) => group.items.map((item) => item.moduleKey)));
    assert.deepEqual([...new Set(keysByView[0])].sort(), [...new Set(keysByView[1])].sort());
    assert.ok(keysByView.every((keys) => keys.every((key) => typeof key === "string" && key.length > 0)));
  }
});
