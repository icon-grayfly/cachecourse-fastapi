# CacheCourse implementation plan

## Goal
Deliver a working mobile-first PWA proof of concept for a source-linked FastAPI pathway. A learner downloads the lesson pack once, completes local challenges offline, keeps progress across refreshes, and sees a dated local next step after completing the path.

## MVP
1. Five original, short lessons: first route, path parameters, request bodies, Pydantic models, and response status codes.
2. Three-question diagnostic recommending Beginner or Fast Track. The learner can change the route at any time.
3. One deterministic code-reading challenge per lesson with a targeted refresher on a wrong answer.
4. Service Worker and Cache API for app assets and lesson pack; IndexedDB for route choice, answers, and completed lessons.
5. Completion-gated opportunity card with source, requirements, application link, and last-checked date.
6. Repository guidance, architecture notes, unit tests, and a browser-based offline demonstration.

## Architecture
- Static HTML, CSS, and browser-native JavaScript keep the first download small and avoid a build step.
- src/logic.js contains pure route, challenge, completion, and unlock rules.
- src/storage.js wraps IndexedDB; it does not send learner data to a server.
- src/lessons.js contains original lesson content and source metadata.
- src/app.js renders the interface and connects browser events to logic and storage.
- service-worker.js caches the shell automatically and the lesson pack on learner request.
- server.mjs serves the app locally using Node's built-in HTTP modules.

## Validation
- Node's built-in test runner covers diagnostic routing, route choice, lesson completion, and opportunity unlocking.
- Browser verification covers first-load download, offline refresh, challenge feedback, and persisted progress.
- Measure the actual lesson payload before quoting a download-size target.
- Recheck the opportunity source and requirements before each public demo.

## Deferred
- Real WhatsApp delivery, live job aggregation, server-side accounts, Python execution in-browser, and generative tutoring.
