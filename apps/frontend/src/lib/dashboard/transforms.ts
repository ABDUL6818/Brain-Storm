import type {
  CourseData,
  CourseFilterKey,
  CourseSortKey,
  CredentialRecord,
  DashboardStats,
  EnrolledCourse,
  ProgressRecord,
} from './types';

/**
 * Pure transforms behind the dashboard. Keeping them out of the components makes
 * the filtering/sorting/aggregation rules unit-testable without rendering.
 */

const COMPLETE_PCT = 100;

/** Normalises the loosely-typed progress payload from the API. */
export function toProgressRecords(raw: unknown): ProgressRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    id: p.id,
    courseId: p.courseId,
    progressPct: p.progressPct ?? 0,
  }));
}

/** Normalises the loosely-typed credential payload from the API. */
export function toCredentialRecords(raw: unknown): CredentialRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => ({
    id: c.id,
    courseId: c.courseId,
    issuedAt: c.issuedAt ?? c.createdAt ?? '',
    course: c.course ? { id: c.course.id, title: c.course.title } : undefined,
  }));
}

/** Newest credential first. Does not mutate the input. */
export function sortCredentialsByIssuedAt(credentials: CredentialRecord[]): CredentialRecord[] {
  return [...credentials].sort(
    (a, b) => Number(new Date(b.issuedAt)) - Number(new Date(a.issuedAt))
  );
}

/** Unique course ids referenced by the given progress records. */
export function courseIdsFromProgress(progress: ProgressRecord[]): string[] {
  return Array.from(new Set(progress.map((p) => p.courseId)));
}

/**
 * Joins progress records with the course lookup. Courses whose details failed to
 * load fall back to a `Course <id>` placeholder so the row still renders.
 */
export function joinCourses(
  progress: ProgressRecord[],
  courses: Record<string, CourseData>
): EnrolledCourse[] {
  return progress.map((record) => {
    const course = courses[record.courseId];
    return {
      ...record,
      title: course?.title ?? `Course ${record.courseId}`,
      level: course?.level,
      durationHours: course?.durationHours,
    };
  });
}

export function filterCourses(
  courses: EnrolledCourse[],
  filter: CourseFilterKey
): EnrolledCourse[] {
  switch (filter) {
    case 'in-progress':
      return courses.filter((c) => c.progressPct > 0 && c.progressPct < COMPLETE_PCT);
    case 'completed':
      return courses.filter((c) => c.progressPct === COMPLETE_PCT);
    default:
      return courses;
  }
}

/** Sorts a copy of `courses`; descending progress or alphabetical title. */
export function sortCourses(courses: EnrolledCourse[], sort: CourseSortKey): EnrolledCourse[] {
  const sorted = [...courses];
  if (sort === 'progress') return sorted.sort((a, b) => b.progressPct - a.progressPct);
  return sorted.sort((a, b) => a.title.localeCompare(b.title));
}

export function filterAndSortCourses(
  courses: EnrolledCourse[],
  filter: CourseFilterKey,
  sort: CourseSortKey
): EnrolledCourse[] {
  return sortCourses(filterCourses(courses, filter), sort);
}

export function computeStats(
  courses: EnrolledCourse[],
  credentials: CredentialRecord[]
): DashboardStats {
  return {
    completed: courses.filter((c) => c.progressPct === COMPLETE_PCT).length,
    inProgress: courses.filter((c) => c.progressPct > 0 && c.progressPct < COMPLETE_PCT).length,
    totalHours: courses.reduce((acc, c) => acc + (c.durationHours ?? 0), 0),
    badges: credentials.length,
  };
}

export function isCourseComplete(progressPct: number): boolean {
  return progressPct === COMPLETE_PCT;
}

/** Human-readable percentage label, clamped to 0-100. */
export function formatProgressLabel(progressPct: number): string {
  const clamped = Math.min(COMPLETE_PCT, Math.max(0, progressPct));
  return `${Math.round(clamped)}%`;
}

/** Formats an ISO date string for display; falls back to an em dash when invalid. */
export function formatIssuedDate(issuedAt: string): string {
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Builds the course lookup keyed by id from a raw course list. */
export function indexCoursesById(courses: CourseData[]): Record<string, CourseData> {
  return courses.reduce<Record<string, CourseData>>((acc, course) => {
    acc[course.id] = course;
    return acc;
  }, {});
}

/** Derives the enrolled-course rows shown on the dashboard from raw API data. */
export function buildEnrolledCourses(
  progress: ProgressRecord[],
  courses: Record<string, CourseData>
): EnrolledCourse[] {
  return joinCourses(progress, courses);
}

/** Applies a real-time progress update to the matching course, if any. */
export function applyProgressUpdate(
  progress: ProgressRecord[],
  update: { courseId: string; progressPct: number }
): ProgressRecord[] {
  return progress.map((p) =>
    p.courseId === update.courseId ? { ...p, progressPct: update.progressPct } : p
  );
}
