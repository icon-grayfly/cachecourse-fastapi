# CacheCourse project guidance

## Product boundaries
- Build a lightweight, mobile-first PWA for first-year online Computer Science learners in Lagos.
- The first proof of concept teaches five FastAPI foundations and demonstrates lesson continuity after a learner downloads the pack.
- Do not imply that completing the pathway is a certification or guarantees an internship.
- Keep the opportunity card visibly dated and distinguish cached information from current online availability.

## Offline and data handling
- Cache the app shell and lesson pack with the Service Worker and Cache API.
- Store answers, route preference, and completion state on-device in IndexedDB.
- Do not add accounts, analytics, or network transmission of learner progress without an explicit product decision.
- Keep the app usable with keyboard and screen-reader navigation; use visible focus states and respect reduced-motion settings.

## Learning content
- Write original explanations and exercises. Link to the exact official reference used.
- Record attribution and license per source item; MDN prose and code examples can have different terms.
- Keep exercises deterministic so they work offline and can be tested without an external model.
- A suggested route must remain user-adjustable.

## Engineering
- Keep the proof of concept dependency-free unless a dependency is needed and its size and purpose are documented.
- Separate pure progression logic from browser storage and DOM rendering.
- Add Node built-in tests for route selection, progression, and opportunity unlocking.
- Verify service-worker caching in a real browser with network access disabled; unit tests alone do not establish offline behavior.
- Update README.md and PLAN.md when architecture or demo behavior changes.
