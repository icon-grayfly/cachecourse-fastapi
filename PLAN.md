# CacheCourse implementation plan

## Goal
Deliver a working mobile-first PWA proof of concept with a general course catalog and distinct same-tab pages for a source-linked FastAPI pathway, a local API practice lab, a sample MIVA CSC 408 module, and source notes. A learner can browse by department, choose a course, organize materials by weeks or suggested study sessions, download the FastAPI lesson pack, complete local challenges offline, and keep progress across refreshes.

## MVP
1. Five original, short lessons: first route, path parameters, request bodies, Pydantic models, and response status codes.
2. Three-question diagnostic recommending Beginner or Fast Track. The learner can change the route at any time.
3. One deterministic code-reading challenge per lesson with a targeted refresher on a wrong answer.
4. Service Worker and Cache API for app assets and lesson pack; IndexedDB for route choice, answers, and completed lessons.
5. Completion-gated opportunity card with source, requirements, application link, and last-checked date.
6. Offline API Studio that simulates GET and POST requests, path parsing, JSON validation, 200/201/404/405/422 outcomes, and a small locally saved notes collection.
7. An original CSC 408 sample lesson on lexical analysis and token types, based on the supplied MIVA course summary, with an offline quiz and separately saved completion.
8. Learning Hub catalog with search, department filters, course cards, and course detail pages. Each detail page has a left course outline; selecting sections or modules opens the selected content in the main workspace. Course pages can group materials by week or suggested study blocks and distinguish interactive material from source-reading references.
9. Separate pages for the pathway, API Studio, Learning Hub, course details, the CSC 408 sample, and source notes; header links navigate among them in the same tab.
10. Repository guidance, architecture notes, unit tests, and a browser-based offline demonstration.

## Architecture
- Static multi-page HTML, CSS, and browser-native JavaScript keep the first download small and avoid a build step. Ordinary same-tab links make every header item a distinct document.
- src/logic.js contains pure route, challenge, completion, and unlock rules.
- src/storage.js wraps IndexedDB; it does not send learner data to a server.
- src/lessons.js contains original lesson content and source metadata.
- src/catalog.js provides department/course metadata and schedule groupings; suggested study blocks are explicitly distinguished from formal timetables and lesson durations.
- src/api-simulator.js contains deterministic request routing, validation, and synthetic response rules; it never executes learner code.
- src/app.js, src/api-studio-app.js, and src/compiler-module-app.js render the individual learning pages and connect browser events to pure logic and storage.
- src/shell.js shares install and connection behavior across pages.
- learning-hub.html and src/learning-hub.js render the searchable, department-filtered course catalog.
- course.html and src/course-page.js render course details with a persistent left outline, week/session grouping, direct in-page lesson navigation, offline challenges, and on-device progress.
- module-compiler.html teaches lexical analysis and tokens using an original summary and exercise grounded in the supplied MIVA CSC 408 course PDF. The PDF's reuse license is not stated; source pages not converted to interactive content are labeled as reading references.
- service-worker.js precaches the app pages and their required assets; the FastAPI lesson pack is a separate cache download.
- server.mjs serves the app locally using Node's built-in HTTP modules.
- FastAPI progress, sample module completion, and API Studio practice notes are stored together in IndexedDB and remain on the learner's device.

## Validation
- Node's built-in test runner covers diagnostic routing, route choice, lesson completion, opportunity unlocking, API route matching, body validation, and note persistence rules.
- Browser verification covers first-load pack download, same-tab navigation, offline refresh of every page, challenge feedback, and persisted progress.
- Browser verification checks API Studio request/response flows, locally saved notes, and the CSC 408 module quiz/completion after a network-disabled refresh.
- Measure the actual lesson payload before quoting a download-size target.
- Recheck the opportunity source and requirements before each public demo.

## Deferred
- Real WhatsApp delivery, live job aggregation, server-side accounts, arbitrary Python execution in-browser, and generative tutoring.
