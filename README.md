# CacheCourse

FastAPI practice that keeps working when the connection drops.

CacheCourse is a dependency-free, offline-first learning PWA for online Computer Science learners in Lagos. The Learning Hub includes 38 Miva Open University programme listings across six schools, with undergraduate, master’s, and doctoral filters. Miva’s public BSc Computer Science outline is organized into 56 course-title references across eight level/semester sections. The proof of concept also includes a five-lesson FastAPI pathway, optional external Udemy links, an offline API Studio, a source-linked MIVA CSC 408 sample, and a local admin console. Learner progress and admin-added catalogue entries remain on-device.

## Run locally

Requirements: Node.js 20 or later. No package installation is required.

For local admin sign-in, copy `.env.example` to `.env.local`, then set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET`. Generate the session secret with:

~~~powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

`.env.local` is ignored by Git. Never put the real credentials in a tracked file.

~~~powershell
npm run dev
~~~

Open http://localhost:4173. Use the header links to move between pages in the same tab. Service Workers require a secure context; localhost is supported by browsers for local development.

If a preview at port 4173 still shows the old two-card Learning Hub, stop its running server with `Ctrl+C`, start `npm run dev` from this repository folder, then reload the page. The PWA caches page files, so a private window is a quick way to confirm the refreshed build without disturbing saved learner progress or local admin entries.

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

## Learning catalogue and admin console

The Miva directory reflects 38 programmes visible in Miva’s public programme catalogue, grouped under its six schools and study levels. Miva’s public BSc Computer Science curriculum lists 56 course titles across eight level/semester groups; CacheCourse presents those as linked source references, not as CacheCourse lessons. Other Miva programme cards link to official pages and do not claim to contain complete syllabi.

Click **Open admin console** on the home page, or **Manage courses** in the Learning Hub, to open the protected `/admin.html` sign-in page. The server verifies credentials configured in environment variables, then issues an eight-hour, signed, HttpOnly, SameSite session cookie. Sign out clears the cookie. Course metadata includes provider, school or department, qualification, level, category, and format. Material entries can be grouped into weeks or sections and record their source, access conditions, licence note, and last-checked date. The console supports JSON export/import for backups.

Admin credentials are never stored in browser code or local storage. Configure them as server environment variables. For a public deployment, replace any credential that has been shared in chat with a unique, strong password. The sign-in is for one administrator; this prototype does not provide account recovery or multi-admin management.

Admin-added catalog entries are still stored in this browser’s `localStorage`. The login protects the authoring flow, but it does not publish edits to every visitor; a shared catalog requires a persistent database and server-authorized write API. Use the source-link fields for materials; do not upload copyrighted course files or describe paid course links as offline content. Some Miva programme pages include carefully labeled Udemy video-course links as optional third-party extras, not Miva requirements; they may require paid enrolment.

## Deploy on Vercel

The app's HTML/CSS/JavaScript is static, and the three admin authentication routes are Node.js Vercel Functions under `api/admin/`. Vercel can serve this project without a frontend build. Import the GitHub repository with the repository root as the Root Directory, choose the **Other** framework preset, and leave the Build Command empty. The Vercel deployment will not run `npm run dev`; that command is only for local development. HTTPS on the deployed domain enables the Service Worker.

Before deploying, add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in **Vercel → Project → Settings → Environment Variables** for Production and Preview, then redeploy. Use a fresh, unique password and a random session secret (at least 32 characters); do not commit these values. Set the project's Production Branch to `master`. Once GitHub is connected, pushes to that branch trigger Production deployments and pushes to other branches create previews. Vercel Functions are deployed from the `/api` directory, and environment-variable changes apply to new deployments.

The admin login can run on Vercel, but edits remain in the signed-in browser until a persistent shared database and admin-authorized write API are added. Never put database credentials or write tokens in browser code.

## Tests

~~~powershell
npm test
~~~

The unit tests cover pathway and API behavior, CSC 408 sample completion, the 38-programme catalogue, the 56-title Computer Science outline, grouped video-resource labels, local catalog behavior, and admin session signing/expiry. They do not replace the browser-based Service Worker offline check.

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
- src/programmes.js: Miva programme directory and public Computer Science course-title outline.
- src/catalog-store.js and admin.html: local catalog editing and JSON backup/import.
- tests/logic.test.js: deterministic pathway, API, course-module, and catalog behavior tests.
