# CacheCourse

FastAPI practice that keeps working when the connection drops.

CacheCourse is a dependency-free, offline-first learning PWA for first-year online Computer Science students in Lagos. The proof of concept includes a five-lesson FastAPI pathway, a learner-adjustable diagnostic, local challenges with targeted refreshers, an offline API Studio, on-device progress, and a dated opportunity card.

## Run locally

Requirements: Node.js 20 or later. No package installation is required.

~~~powershell
npm run dev
~~~

Open http://localhost:4173. Service Workers require a secure context; localhost is supported by browsers for local development.

## Use the offline pathway

1. Open the app while connected.
2. Choose Download lesson pack and wait for the saved confirmation.
3. Open the diagnostic or choose a route manually.
4. In API Studio, send a learner lookup and create a practice note. The response is simulated locally; the note is stored in IndexedDB on this device.
5. Use browser developer tools to disable the network, then refresh. Confirm the lesson pathway and API Studio still load, try a challenge, and use `GET /notes` to read the saved practice note.
6. Progress and practice notes stay on this device. External references and current opportunity availability require a connection.

## Tests

~~~powershell
npm test
~~~

The unit tests cover pure pathway and API simulation logic. They do not replace the browser-based Service Worker offline check.

## API Studio

API Studio is a deterministic FastAPI-style simulator, not a live Python server. It demonstrates route matching, path-parameter parsing, JSON request-body validation, and response statuses while offline. Learner-entered code is never executed. `POST /notes` creates a synthetic practice note in local browser storage; the Clear local notes control removes only those practice notes.

## Content and opportunity notes

Lessons are original summaries linked to official FastAPI documentation. Each source entry shows a URL and license note. The opportunity card is a point-in-time example, not a guarantee of eligibility or employment; verify the employer page before presenting it.

## Project artifacts

- AGENTS.md: repository instructions for Codex and contributors.
- PLAN.md: MVP boundaries, architecture, validation, and deferred features.
- tests/logic.test.js: deterministic pathway behavior tests.
