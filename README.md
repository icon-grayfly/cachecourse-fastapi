# CacheCourse

Learning that keeps moving—even when the connection drops.

CacheCourse is a lightweight, offline-first learning PWA for online learners in Lagos. Home introduces learning across fields and includes a platform-wide course search. The Learning Hub includes 38 Miva Open University programme listings across six schools, with undergraduate, master’s, and doctoral filters. Miva’s public BSc Computer Science outline is organized into 56 course-title references across eight level/semester sections. A focused FastAPI pathway and practice lab offer technology-specific learning alongside a CSC 408 sample. Community includes ten career-sector groups, member-approved additional memberships, live group chat, and private messages. Core lesson answers, route choice, completion, and favourites remain on-device. Separate account activity may be sent to Supabase under the tracking disclosure described below.

## Run locally

Requirements: Node.js 20 or later. No package installation is required.

For local admin sign-in and management features, copy `.env.example` to `.env.local`, then set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. For Community chat, also set `SUPABASE_PUBLISHABLE_KEY` to the browser-safe key from the same project. The service-role key is server-only and is required for user, community, messaging, and activity administration. Generate the session secret with:

~~~powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

`.env.local` is ignored by Git. Never put the real credentials or service-role key in a tracked file or browser module. If the admin key is not configured, the existing local course editor still works and the remote admin modules report that setup is incomplete.

~~~powershell
npm run dev
~~~

Open http://localhost:4173. Use the header links to move between Home, API Studio, Learning Hub, and Community in the same tab. Home introduces learning across fields and links to the catalogue, sample activities, and community. Sector groups open as in-page views on Community. Service Workers require a secure context; localhost is supported by browsers for local development.

If a preview at port 4173 still shows the old two-card Learning Hub, stop its running server with `Ctrl+C`, start `npm run dev` from this repository folder, then reload the page. The PWA caches page files, so a private window is a quick way to confirm the refreshed build without disturbing saved learner progress or local admin entries.

## Set up the live Community chat

The ten Community sector groups use Supabase Auth, Postgres, and Realtime for email/password accounts, member-only group chat, per-group online presence, blocking, message reports, and moderator removal. The directory keeps all ten sector choices visible and marks groups unavailable when their Supabase records are missing or inactive. First group membership is immediate. Requests to join additional groups wait for global-admin approval. Joined groups open in the same Community page with an in-page module pane for Overview, Live chat, Members, and Direct messages. Learners can privately message other members of their groups and receive private admin messages; user-to-user conversations are only visible to their participants. Chat and remote admin features require a configured Supabase project; the offline learning app remains usable without them.

1. Create a Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the project's SQL Editor, run `supabase/migrations/20261101000100_community_chat.sql`, `supabase/migrations/20261101000200_community_chat_presence.sql`, `supabase/migrations/20261101000300_community_sector_groups.sql`, `supabase/migrations/20261102000100_admin_platform_management.sql`, `supabase/migrations/20261102000200_community_profile_avatars.sql`, and `supabase/migrations/20261102000300_admin_dashboard_analytics.sql`, in that order. The fourth migration adds approval-based multi-group memberships, private messaging, learner activity with opt-out, anonymous aggregate visit counts, and admin summary access. The fifth creates private profile-photo storage with upload and read access limited to the owner and signed-in members of shared active communities. The sixth enables dashboard activity trend and event-mix summaries. For a fresh project, apply all six migrations; existing projects must apply any they do not yet have.
3. In Supabase **Realtime → Settings**, turn off **Allow public access** so the private sector-channel policies are enforced.
4. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:4173` and add `http://localhost:4173/community.html` as a redirect URL. Add your deployed HTTPS origin and its Community URL before deploying. Password recovery redirects to the same Community URL; configure it as an allowed redirect. Leave email confirmation enabled for a public project.
5. In **Project Settings → API**, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env.local` for local development and in Vercel Environment Variables for deployments. The public-config endpoint supplies these browser-safe values to Community; it must point to the same project as the server's `SUPABASE_URL`. A publishable key is intended for browser use; never expose a `sb_secret_...` or legacy `service_role` key to the browser.
6. Reload `/community.html`, then use the separate **Log in** or **Sign Up** buttons in the top-right header. Confirm the email if prompted. A signed-out learner can choose **Forgot password?** on the Log in form, request a reset link, and set a new password after returning to Community. After signing in, use **My profile** in the header to view the account, change or remove a profile photo, manage the saved-course wishlist, or sign out. Profile photos are private and visible to signed-in members of shared active communities. **Join Group** opens an in-page group view. The first group can be joined directly; further groups require admin approval. Refresh Community after approval to load the new membership.
7. After creating the moderator's account, run this once in the SQL Editor, replacing the email with that account's address:

~~~sql
insert into public.community_moderators (user_id)
select id from auth.users where email = 'moderator@example.com'
on conflict (user_id) do nothing;
~~~

### Connect a fresh Supabase project to local Admin

After adding the six migrations above:

1. In `.env.local`, set `SUPABASE_URL` to the new project's URL, `SUPABASE_SERVICE_ROLE_KEY` to that project's server-only secret/service-role key, `SUPABASE_PUBLISHABLE_KEY` to the browser-safe publishable key, and set the admin username, password, and session secret. Keep this file local and do not paste its contents into chat or commit it.
2. Set the same `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel Environment Variables. The `/api/public-config` endpoint exposes only these browser-safe values; it never returns the service-role key.
3. Stop and restart the local Node server so it reloads `.env.local`, then refresh the page. Sign in at `/admin.html`; the Activity dashboard fetches its data through the server using the administrator session.
4. Open **Communities** and confirm the ten sector groups appear. Try joining one with a learner account, then check **Users** and **Activity dashboard**. Anonymous page totals and signed-in activity are separate; activity charts remain empty until visits are counted and learners record study events.
5. In Supabase Auth URL Configuration, retain the local redirect URLs and add the production HTTPS site and Community URLs when deploying. Configure email delivery before relying on password reset or confirmation emails.

The Activity dashboard refreshes its summary every 20 seconds while open and visible. It displays anonymous visit trends separately from disclosed learner activity and does not add analytics beyond the activity and aggregate-visit data described in the privacy section.

Before inviting people, configure Supabase Auth's signup protections and email rate limits for your expected audience. The client-side form is not an abuse-prevention boundary; database row-level security and group/direct-message rate limits are enforced server-side. Moderators can remove messages in a group and review reports from the SQL Editor:

~~~sql
select id, reporter_id, message_id, reason, created_at
from public.community_reports
order by created_at desc;
~~~

The browser loads the official Supabase JavaScript SDK v2.118.0 on demand. Its reported minified bundle size is approximately 56.3 KB gzipped; it is used for Auth, database access, Realtime messages, and online presence. The SDK and chat require internet access; the rest of the app remains usable offline. Group messages are limited to group members (and hidden from a member who blocked the author); private learner messages are limited to their participants. Messages remain until their account is deleted. Moderator redaction replaces group message text with a removal notice. Review Supabase's [password authentication](https://supabase.com/docs/guides/auth/passwords), [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), and [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization) before inviting users.

## Learner activity and privacy

When a signed-in learner visits the platform, a visible notice explains that CacheCourse records page visits, course views, and completed lessons for study-flow support. Individual activity tracking is on by default after this notice and can be turned off at any time using **Turn tracking off**. Learners can also erase their recorded study history from the same notice. Turning tracking off prevents future individual activity events; it does not delete prior events unless the learner chooses **Erase my activity**. Account-linked events are retained until erased or the account is deleted.

Platform traffic is counted separately as daily page totals. These aggregate counts do not contain account IDs, IP addresses, or visitor IDs; a browser session limits repeat refresh counts for the same page. The Admin Activity dashboard shows those totals separately from account-linked learner activity. Anonymous visit records are retained until removed from the database.

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

Course cards and course pages can be saved to a device-local learning wishlist. The wishlist appears in the Learning Hub and Community profile. Weekly reminders are enabled by default; learners can choose monthly reminders or turn them off. Reminders are small in-app prompts shown when the app is open or next visited; CacheCourse does not send push notifications or learner preferences to the chat service.

The global admin console is available directly at `/admin.html`, but is deliberately absent from public navigation, search indexing, and the offline shell cache. The server verifies the single administrator's credentials from environment variables, then issues an eight-hour, signed, HttpOnly, SameSite session cookie. Sign out clears the cookie. This is access control—not a hidden-click shortcut. The colored left navigation provides an activity dashboard, all-user directory and profile/status controls, community and member management, membership approvals, a private admin inbox, study-flow history, and course catalogue tools. Course metadata includes provider, school or department, qualification, level, category, and format. Material entries can be grouped into weeks or sections and record their source, access conditions, licence note, and last-checked date. The console supports local JSON export/import for course backups.

Admin credentials are never stored in browser code or local storage. Configure them as server environment variables. The sign-in is for one administrator; this prototype does not provide account recovery or multi-admin management. On production hosting, also use the provider's deployment access controls for the admin route if available.

Admin-added course catalog entries are still stored in this browser’s `localStorage`; they are not published to every visitor. The remote management modules use server-authorized Supabase APIs and require the server-side service-role key. The admin API does not expose learner-to-learner private message content in its admin inbox. Use the source-link fields for materials; do not upload copyrighted course files or describe paid course links as offline content. Some Miva programme pages include carefully labeled Udemy video-course links as optional third-party extras, not Miva requirements; they may require paid enrolment.

## Deploy on Vercel

The app's HTML/CSS/JavaScript is static, and the admin authentication and management routes are Node.js Vercel Functions under `api/admin/`. Vercel can serve this project without a frontend build. Import the GitHub repository with the repository root as the Root Directory, choose the **Other** framework preset, and leave the Build Command empty. The Vercel deployment will not run `npm run dev`; that command is only for local development. HTTPS on the deployed domain enables the Service Worker.

Before deploying, add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in **Vercel → Project → Settings → Environment Variables** for Production and Preview, then redeploy. Use a fresh, unique password and a random session secret (at least 32 characters); never expose or commit the service-role key. Set the project's Production Branch to `master`. Once GitHub is connected, pushes to that branch trigger Production deployments and pushes to other branches create previews. Vercel Functions are deployed from the `/api` directory, and environment-variable changes apply to new deployments.

Course authoring remains local to the administrator's browser. User, community, membership, messaging, and activity modules use the configured Supabase database through authenticated server APIs. Never put database credentials or write tokens in browser code.

## Tests

~~~powershell
npm test
~~~

The unit tests cover pathway and API behavior, CSC 408 sample completion, the 38-programme catalogue, the 56-title Computer Science outline, community and activity policy shape, server-protected admin APIs, grouped video-resource labels, local catalog behavior, and admin session signing/expiry. They do not replace the browser-based Service Worker offline check or live Supabase multi-user testing.

## API Studio

API Studio is a deterministic FastAPI-style simulator, not a live Python server. It demonstrates route matching, path-parameter parsing, JSON request-body validation, and response statuses while offline. Learner-entered code is never executed. `POST /notes` creates a synthetic practice note in local browser storage; the Clear local notes control removes only those practice notes.

## CSC 408 sample module

The sample page teaches lexical analysis and token categories using original explanations, a newly written code example, and an offline deterministic quick check. Its source is MIVA Open University's *CSC 408 Full Course Summary*, Weeks 1–4, page 2, supplied for this prototype. The PDF does not state a reuse license; CacheCourse does not copy its slide image or passages. The catalog references the source document's week and page ranges. Those entries are identified as source reading rather than interactive modules.

## Page navigation and offline shell

The app is a small static multi-page PWA. Header links use ordinary same-tab navigation to separate HTML documents. Home introduces learning across different subjects and career paths, then links to the catalogue, sample activities, and the technology pathway. Community organizes the ten professional groups as same-page hash views, retains the source and license notes, and optionally connects to Supabase for member-only live chat; chat is not cached and requires an internet connection. The Learning Hub filters the catalog by department and search text; each course page renders schedule groups from `src/catalog.js`, with a switch between week and suggested study-session organization. The Service Worker precaches the app pages and their scripts/styles, while the optional downloaded FastAPI lesson pack remains a separate Cache API entry.

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
