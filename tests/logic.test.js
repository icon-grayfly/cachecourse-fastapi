import test from "node:test";
import assert from "node:assert/strict";
import { LESSONS } from "../src/lessons.js";
import { completeLesson, createInitialState, getNextLesson, getSuggestedRoute, isOpportunityUnlocked, normalizeState, setRoute } from "../src/logic.js";

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
