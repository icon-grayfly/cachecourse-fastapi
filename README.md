# CacheCourse

FastAPI practice that keeps working when the connection drops.

CacheCourse is a dependency-free, offline-first learning PWA for first-year online Computer Science students in Lagos. Its navigation opens distinct same-tab pages for the five-lesson FastAPI pathway, the offline API Studio, a sample MIVA CSC 408 Compiler Construction lesson, and source notes. Progress and practice remain on-device.

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
5. Open the CSC 408 sample and answer the lexical-analysis quick check. Its completion is stored separately from the FastAPI pathway.
6. Use browser developer tools to disable the network, then refresh and open each header page. Confirm cached pages, the downloaded FastAPI pack, the CSC 408 sample, and local API practice still work. External references and current opportunity availability require a connection.
7. Progress, the sample lesson answer, and practice notes stay on this device.

## Tests

~~~powershell
npm test
~~~

The unit tests cover pure pathway, API simulation, and CSC 408 sample completion logic. They do not replace the browser-based Service Worker offline check.

## API Studio

API Studio is a deterministic FastAPI-style simulator, not a live Python server. It demonstrates route matching, path-parameter parsing, JSON request-body validation, and response statuses while offline. Learner-entered code is never executed. `POST /notes` creates a synthetic practice note in local browser storage; the Clear local notes control removes only those practice notes.

## CSC 408 sample module

The sample page teaches lexical analysis and token categories using original explanations, a newly written code example, and an offline deterministic quick check. Its source is MIVA Open University's *CSC 408 Full Course Summary*, Weeks 1–4, page 2, supplied for this prototype. The PDF does not state a reuse license; CacheCourse does not copy its slide image or passages.

## Page navigation and offline shell

The app is a small static multi-page PWA. Header links use ordinary same-tab navigation to separate HTML documents. The Service Worker precaches all four pages and their scripts/styles, while the optional downloaded lesson pack remains a separate Cache API entry.

## Content and opportunity notes

Lessons are original summaries linked to official FastAPI documentation. Each source entry shows a URL and license note. The opportunity card is a point-in-time example, not a guarantee of eligibility or employment; verify the employer page before presenting it.

## Project artifacts

- AGENTS.md: repository instructions for Codex and contributors.
- PLAN.md: MVP boundaries, architecture, validation, and deferred features.
- tests/logic.test.js: deterministic pathway, API, and course-module behavior tests.
