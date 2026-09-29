import { answerCompilerQuestion, createInitialState, normalizeState } from "./logic.js";
import { loadProgress, saveProgress } from "./storage.js";

const form = document.querySelector("#compiler-quiz");
const feedback = document.querySelector("#compiler-feedback");
const completion = document.querySelector("#compiler-completion");

function showSavedAnswer(state) {
  if (state.compilerModuleAnswer) {
    const input = form.querySelector('input[value="' + state.compilerModuleAnswer + '"]');
    if (input) input.checked = true;
  }
  if (state.compilerModuleCompleted) {
    feedback.hidden = false;
    feedback.classList.add("is-correct");
    feedback.textContent = "Correct. The plus sign is an operator token. The lesson is complete and saved on this device.";
    completion.textContent = "Completed on this device · You can revisit this lesson any time.";
    completion.classList.add("is-complete");
    form.querySelector('button[type="submit"]').textContent = "Answer saved";
    form.querySelector('button[type="submit"]').disabled = true;
  }
}

async function start() {
  let state = normalizeState(await loadProgress(createInitialState()));
  showSavedAnswer(state);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = new FormData(form).get("compiler-answer");
    if (!selected) {
      feedback.hidden = false;
      feedback.classList.remove("is-correct");
      feedback.textContent = "Choose an answer to check your understanding.";
      return;
    }
    state = answerCompilerQuestion(state, selected);
    const saved = await saveProgress(state);
    feedback.hidden = false;
    feedback.classList.toggle("is-correct", state.compilerModuleCompleted);
    feedback.textContent = state.compilerModuleCompleted
      ? "Correct. The plus sign is an operator token. It combines the two values."
      : "Not quite. Quick refresher: an identifier names something; an operator describes an action such as addition. Try again.";
    if (state.compilerModuleCompleted) {
      completion.textContent = saved ? "Completed on this device · You can revisit this lesson any time." : "Completed for this session · Browser storage could not save it.";
      completion.classList.add("is-complete");
      form.querySelector('button[type="submit"]').textContent = "Answer saved";
      form.querySelector('button[type="submit"]').disabled = true;
    }
  });
}

start();
