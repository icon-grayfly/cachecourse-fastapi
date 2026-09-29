# CacheCourse

FastAPI practice that keeps working when the connection drops.

CacheCourse is a dependency-free, offline-first learning PWA for online Computer Science learners in Lagos. The Learning Hub organizes courses by department and opens a separate course page with week-based or suggested study-session views. The proof of concept includes a five-lesson FastAPI pathway, an offline API Studio, and a source-linked MIVA CSC 408 Compiler Construction sample. Progress and practice remain on-device.

## Run locally

Requirements: Node.js 20 or later. No package installation is required.

~~~powershell
npm run dev
~~~

Open http://localhost:4173. Use the header links to move between pages in the same tab. Service Workers require a secure context; localhost is supported by browsers for local development.

## Use the offline pathway

1. Open the app while connected.
2. Choose Download lesson pack and wait for the saved confirmation.
3. Open the diagnostic or choose a route manually.
4. Open API Studio and send a learner lookup or create a practice note. The response is simulated locally; the note is stored in IndexedDB on this device.
5. Open Learning Hub. Search by course or filter by department, then open CSC 408 or the FastAPI pathway.
6. In CSC 408, switch between its supplied week ranges and suggested study blocks. The interactive lexical-analysis sample is clearly distinguished from source-reading references that have not been converted into lessons.
7. Answer the CSC 408 sample quick check. Its completion is stored separately from the FastAPI pathway.
8. Use browser developer tools to disable the network, then refresh and open each header page. Confirm cached pages, the downloaded FastAPI pack, the Learning Hub, course detail pages, the CSC 408 sample, and local API practice still work. External references and current opportunity availability require a connection.
9. Progress, the sample lesson answer, and practice notes stay on this device.

## Tests

~~~powershell
npm test
~~~

The unit tests cover pathway and API behavior, CSC 408 sample completion, and Learning Hub course grouping. They do not replace the browser-based Service Worker offline check.

## API Studio

API Studio is a deterministic FastAPI-style simulator, not a live Python server. It demonstrates route matching, path-parameter parsing, JSON request-body validation, and response statuses while offline. Learner-entered code is never executed. `POST /notes` creates a synthetic practice note in local browser storage; the Clear local notes control removes only those practice notes.

## CSC 408 sample module

The sample page teaches lexical analysis and token categories using original explanations, a newly written code example, and an offline deterministic quick check. Its source is MIVA Open University's *CSC 408 Full Course Summary*, Weeks 1–4, page 2, supplied for this prototype. The PDF does not state a reuse license; CacheCourse does not copy its slide image or passages. The catalog references the source document's week and page ranges. Those entries are identified as source reading rather than interactive modules.

## Page navigation and offline shell

The app is a small static multi-page PWA. Header links use ordinary same-tab navigation to separate HTML documents. The Learning Hub filters the catalog by department and search text; each course page renders schedule groups from `src/catalog.js`, with a switch between week and suggested study-session organization. The Service Worker precaches the app pages and their scripts/styles, while the optional downloaded FastAPI lesson pack remains a separate Cache API entry.

Each course card opens directly into its learning workspace, with a left course outline. Selecting a week/session header shows its section overview; selecting a module opens its reading or practice in place. FastAPI and CSC 408 answers share the existing on-device IndexedDB progress store. The FastAPI course's one-hour study blocks are suggestions for adding API Studio practice and review to the short lesson content. They are not lecture durations or an institutional timetable. The CSC 408 source summary is not hosted in the app; learners need their own supplied copy to read the referenced pages.

## Content and opportunity notes

Lessons are original summaries linked to official FastAPI documentation. Each source entry shows a URL and license note. The opportunity card is a point-in-time example, not a guarantee of eligibility or employment; verify the employer page before presenting it.

## Project artifacts

- AGENTS.md: repository instructions for Codex and contributors.
- PLAN.md: MVP boundaries, architecture, validation, and deferred features.
- src/catalog.js: course metadata and week/session groupings.
- tests/logic.test.js: deterministic pathway, API, course-module, and catalog behavior tests.
