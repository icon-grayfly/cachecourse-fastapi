export const MAX_PRACTICE_NOTES = 50;

export const API_SCENARIOS = {
  learner: {
    label: "Find a sample learner · GET",
    method: "GET",
    path: "/learners/42",
    body: "",
    source: "Path parameters",
    sourceUrl: "https://fastapi.tiangolo.com/tutorial/path-params/",
    code: 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/learners/{learner_id}")\ndef read_learner(learner_id: int):\n    return {"id": learner_id, "track": "FastAPI foundations"}'
  },
  invalidLearner: {
    label: "Send invalid path data · GET",
    method: "GET",
    path: "/learners/not-a-number",
    body: "",
    source: "Path parameters · validation",
    sourceUrl: "https://fastapi.tiangolo.com/tutorial/path-params/",
    code: 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/learners/{learner_id}")\ndef read_learner(learner_id: int):\n    return {"id": learner_id}'
  },
  createNote: {
    label: "Create a practice note · POST",
    method: "POST",
    path: "/notes",
    body: '{\n  "title": "Practise FastAPI",\n  "done": false\n}',
    source: "Request body · status codes",
    sourceUrl: "https://fastapi.tiangolo.com/tutorial/body/",
    code: 'from fastapi import FastAPI\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\nclass Note(BaseModel):\n    title: str\n    done: bool = False\n\n@app.post("/notes", status_code=201)\ndef create_note(note: Note):\n    return note'
  },
  listNotes: {
    label: "Read saved practice notes · GET",
    method: "GET",
    path: "/notes",
    body: "",
    source: "Path operations · response bodies",
    sourceUrl: "https://fastapi.tiangolo.com/tutorial/first-steps/",
    code: 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/notes")\ndef list_notes():\n    return {"items": [], "count": 0}'
  }
};

export function normalizePracticeNotes(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter((note) => {
    if (!note || typeof note !== "object" || !Number.isSafeInteger(note.id) || note.id < 1 || typeof note.title !== "string" || typeof note.done !== "boolean") return false;
    if (seen.has(note.id)) return false;
    seen.add(note.id);
    return true;
  }).map((note) => ({ id: note.id, title: note.title.trim().slice(0, 120), done: note.done })).filter((note) => note.title.length > 0).slice(-MAX_PRACTICE_NOTES);
}

function response(status, statusText, body, explanation, notes, changed) {
  return { status, statusText, body, explanation, notes, changed };
}

function notFound(method, path, notes) {
  return response(404, "Not Found", { detail: "No practice route matches " + method + " " + path + "." }, "The request path does not match one of the routes in this practice API.", notes, false);
}

function methodNotAllowed(method, path, allowed, notes) {
  return response(405, "Method Not Allowed", { detail: "This route does not accept " + method + ".", allow: allowed }, "The path exists, but its FastAPI route uses a different HTTP method.", notes, false);
}

function invalidBody(details, notes) {
  return response(422, "Unprocessable Entity", { detail: details }, "The JSON reached the route, but it does not match the request model yet.", notes, false);
}

export function simulateRequest(request, savedNotes) {
  const method = String(request && request.method || "GET").trim().toUpperCase();
  const path = String(request && request.path || "").trim();
  const notes = normalizePracticeNotes(savedNotes);
  const learnerRoute = /^\/learners\/([^/]+)$/.exec(path);
  const noteRoute = /^\/notes\/([^/]+)$/.exec(path);

  if (learnerRoute) {
    if (method !== "GET") return methodNotAllowed(method, path, ["GET"], notes);
    if (!/^\d+$/.test(learnerRoute[1])) {
      return invalidBody([{ loc: ["path", "learner_id"], msg: "Input should be a valid integer", type: "int_parsing" }], notes);
    }
    const id = Number(learnerRoute[1]);
    if (id !== 42) return response(404, "Not Found", { detail: "Sample learner " + id + " was not found." }, "The path parameter is an integer, but this tiny practice API only seeds learner 42.", notes, false);
    return response(200, "OK", { id: 42, track: "FastAPI foundations", cohort: "Lagos online CS" }, "The route matched, and FastAPI parsed learner_id as an integer.", notes, false);
  }

  if (path === "/notes") {
    if (method === "GET") return response(200, "OK", { items: notes, count: notes.length }, "GET reads the locally saved practice notes. This sample database lives only in this browser.", notes, false);
    if (method !== "POST") return methodNotAllowed(method, path, ["GET", "POST"], notes);
    let payload;
    try {
      payload = JSON.parse(String(request.body || ""));
    } catch {
      return invalidBody([{ loc: ["body"], msg: "JSON could not be decoded", type: "json_invalid" }], notes);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return invalidBody([{ loc: ["body"], msg: "Input should be a JSON object", type: "model_type" }], notes);
    }
    if (typeof payload.title !== "string" || !payload.title.trim()) {
      return invalidBody([{ loc: ["body", "title"], msg: "Field required: add a non-empty title", type: "missing" }], notes);
    }
    if (payload.title.trim().length > 120) {
      return invalidBody([{ loc: ["body", "title"], msg: "Title must be 120 characters or fewer", type: "string_too_long" }], notes);
    }
    if (payload.done !== undefined && typeof payload.done !== "boolean") {
      return invalidBody([{ loc: ["body", "done"], msg: "Input should be a valid boolean", type: "bool_parsing" }], notes);
    }
    if (notes.length >= MAX_PRACTICE_NOTES) {
      return response(507, "Insufficient Storage", { detail: "The local practice API is full. Clear saved practice notes to continue." }, "This prototype keeps a small capped note set in browser storage.", notes, false);
    }
    const id = notes.reduce((highest, note) => Math.max(highest, note.id), 0) + 1;
    const created = { id, title: payload.title.trim(), done: payload.done === undefined ? false : payload.done };
    const nextNotes = notes.concat(created);
    return response(201, "Created", created, "POST validated the request body, created a local practice note, and returned 201 Created.", nextNotes, true);
  }

  if (noteRoute) {
    if (method !== "GET") return methodNotAllowed(method, path, ["GET"], notes);
    if (!/^\d+$/.test(noteRoute[1])) {
      return invalidBody([{ loc: ["path", "note_id"], msg: "Input should be a valid integer", type: "int_parsing" }], notes);
    }
    const note = notes.find((item) => item.id === Number(noteRoute[1]));
    if (!note) return response(404, "Not Found", { detail: "Practice note was not found." }, "Create a note with POST /notes, then try its returned id here.", notes, false);
    return response(200, "OK", note, "The note was read from this browser's local practice database.", notes, false);
  }

  return notFound(method || "GET", path || "(empty path)", notes);
}
