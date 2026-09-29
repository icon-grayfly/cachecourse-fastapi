import { LESSONS } from "./lessons.js";

const lessonsById = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
const lessonItems = (ids) => ids.map((id) => ({
  title: lessonsById.get(id).title,
  detail: lessonsById.get(id).subtitle,
  duration: lessonsById.get(id).duration,
  type: "Interactive practice",
  href: "/index.html#lesson-list"
}));

export const COURSES = [
  {
    id: "csc408",
    department: "Computer Science",
    institution: "MIVA Open University",
    code: "CSC 408",
    title: "Compiler Construction",
    description: "A course companion organized around the supplied Weeks 1–12 course summary, with one short interactive sample and clear references to the remaining source pages.",
    level: "Course companion",
    accent: "compiler",
    format: "Weekly course material",
    interactiveCount: 1,
    sourceNote: "Based on MIVA CSC 408 Full Course Summary · 11 pages",
    views: {
      weeks: [
        {
          title: "Weeks 1–4",
          subtitle: "Course summary · pages 2–5",
          items: [
            { title: "How source code becomes tokens", detail: "A short original lesson on lexical analysis", duration: "6 min", type: "Interactive sample", href: "/module-compiler.html" },
            { title: "Continue with the source summary", detail: "Use the supplied course document for the rest of this section", duration: "Pages 3–5", type: "Source reading" }
          ]
        },
        {
          title: "Weeks 5–8",
          subtitle: "Course summary · pages 6–8",
          items: [{ title: "Course material reading set", detail: "Reference the corresponding pages in your supplied CSC 408 course summary", duration: "Pages 6–8", type: "Source reading · not yet interactive" }]
        },
        {
          title: "Weeks 9–12",
          subtitle: "Course summary · pages 9–11",
          items: [{ title: "Course material reading set", detail: "Reference the corresponding pages in your supplied CSC 408 course summary", duration: "Pages 9–11", type: "Source reading · not yet interactive" }]
        }
      ],
      sessions: [
        {
          title: "Study block · Weeks 1–4",
          subtitle: "Suggested 1-hour block · flexible pacing, not an official timetable",
          items: [
            { title: "How source code becomes tokens", detail: "Complete the interactive sample, then review the matching source pages", duration: "6 min interactive + review", type: "Interactive sample", href: "/module-compiler.html" },
            { title: "Course summary review", detail: "Continue in the supplied CSC 408 course document", duration: "Pages 2–5", type: "Source reading" }
          ]
        },
        {
          title: "Study block · Weeks 5–8",
          subtitle: "Suggested 1-hour block · flexible pacing, not an official timetable",
          items: [{ title: "Course summary review", detail: "Read and make notes from the supplied course document", duration: "Pages 6–8", type: "Source reading · not yet interactive" }]
        },
        {
          title: "Study block · Weeks 9–12",
          subtitle: "Suggested 1-hour block · flexible pacing, not an official timetable",
          items: [{ title: "Course summary review", detail: "Read and make notes from the supplied course document", duration: "Pages 9–11", type: "Source reading · not yet interactive" }]
        }
      ]
    }
  },
  {
    id: "fastapi",
    department: "Software Engineering",
    institution: "CacheCourse Skills Pathway",
    code: "API 101",
    title: "Backend APIs with FastAPI",
    description: "Build a small foundation in routes, URL data, JSON request bodies, validation, and response status codes with offline-ready practice.",
    level: "Foundations · self-paced",
    accent: "fastapi",
    format: "Short lessons · suggested sessions",
    interactiveCount: LESSONS.length,
    sourceNote: "Five original lessons · official references linked in each lesson",
    views: {
      weeks: [
        { title: "Suggested week 1 · Routing", subtitle: "A flexible starting sequence", items: lessonItems(["first-route", "path-params"]) },
        { title: "Suggested week 2 · Request data", subtitle: "A flexible practice sequence", items: lessonItems(["request-body", "validation"]) },
        { title: "Suggested week 3 · Responses", subtitle: "A flexible practice sequence", items: lessonItems(["status-codes"]) }
      ],
      sessions: [
        { title: "Study block 1 · Routing and URL data", subtitle: "Suggested 1-hour block · includes hands-on API Studio practice", items: lessonItems(["first-route", "path-params"]) },
        { title: "Study block 2 · JSON and validation", subtitle: "Suggested 1-hour block · includes hands-on API Studio practice", items: lessonItems(["request-body", "validation"]) },
        { title: "Study block 3 · Response behavior", subtitle: "Suggested 1-hour block · includes hands-on API Studio practice", items: lessonItems(["status-codes"]) }
      ]
    }
  }
];

export function getCourse(courseId) {
  return COURSES.find((course) => course.id === courseId) || null;
}

export function getCourseSchedule(courseId, view = "weeks") {
  const course = getCourse(courseId);
  if (!course || !["weeks", "sessions"].includes(view)) return [];
  return course.views[view];
}
