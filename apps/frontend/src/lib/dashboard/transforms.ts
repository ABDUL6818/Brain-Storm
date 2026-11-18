import type {
  CourseData,
  CourseFilterKey,
  CourseSortKey,
  CredentialRecord,
  DashboardStats,
  EnrolledCourse,
  ProgressRecord,
} from './types';
import type {
  CredentialDisplay,
  CredentialVerificationStatus,
  LessonListItem,
  LessonProgressStatus,
  ProfileFieldErrors,
  ProfileFormValues,
  ProfilePayload,
  ProfileResponse,
} from './viewerTypes';

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

/** Applies a real-time progress update to the matching course, if any. */
export function applyProgressUpdate(
  progress: ProgressRecord[],
  update: { courseId: string; progressPct: number }
): ProgressRecord[] {
  return progress.map((p) =>
    p.courseId === update.courseId ? { ...p, progressPct: update.progressPct } : p
  );
}

/* -------------------------------------------------------------------------- */
/* LessonViewer transforms                                                    */
/* -------------------------------------------------------------------------- */

/** Maps a raw progress percentage to a coarse lesson status. */
export function toLessonStatus(progressPct: number): LessonProgressStatus {
  if (progressPct >= COMPLETE_PCT) return 'completed';
  if (progressPct > 0) return 'in-progress';
  return 'not-started';
}

/** Normalises the loosely-typed lesson payload from the API. */
export function toLessonList(raw: unknown): LessonListItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((lesson, index) => {
    const progressPct = lesson.progressPct ?? 0;
    return {
      id: lesson.id,
      title: lesson.title ?? `Lesson ${index + 1}`,
      order: lesson.order ?? index + 1,
      durationMinutes: lesson.durationMinutes ?? 0,
      progressPct,
      status: toLessonStatus(progressPct),
    };
  });
}

/** Sorts a copy of `lessons` by their `order` ascending. */
export function sortLessonsByOrder(lessons: LessonListItem[]): LessonListItem[] {
  return [...lessons].sort((a, b) => a.order - b.order);
}

/** Overall course progress derived from the lesson list (0 when empty). */
export function computeLessonProgress(lessons: LessonListItem[]): number {
  if (lessons.length === 0) return 0;
  const total = lessons.reduce((acc, l) => acc + l.progressPct, 0);
  return Math.round(total / lessons.length);
}

/* -------------------------------------------------------------------------- */
/* CredentialView transforms                                                  */
/* -------------------------------------------------------------------------- */

/** Maps a verification flag/payload to a display status. */
export function toVerificationStatus(raw: unknown): CredentialVerificationStatus {
  if (raw === true || raw === 'verified') return 'verified';
  if (raw === 'pending') return 'pending';
  if (raw === false || raw === 'failed') return 'failed';
  return 'unverified';
}

/** Formats an ISO date for display; returns an empty string when invalid. */
export function formatIssuedAt(issuedAt: string): string {
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Maps a credential record to its presentational shape. */
export function toCredentialDisplay(record: CredentialRecord): CredentialDisplay {
  const raw = record as CredentialRecord & { verified?: unknown };
  return {
    id: record.id,
    title: record.course?.title ?? `Credential ${record.id}`,
    issuedAt: record.issuedAt,
    issuedAtLabel: formatIssuedAt(record.issuedAt),
    verification: toVerificationStatus(raw.verified),
  };
}

/** Maps a list of credential records to display shapes. */
export function toCredentialDisplays(records: CredentialRecord[]): CredentialDisplay[] {
  return records.map(toCredentialDisplay);
}

/* -------------------------------------------------------------------------- */
/* ProfileForm transforms                                                     */
/* -------------------------------------------------------------------------- */

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  name: '',
  email: '',
  bio: '',
};

/** Maps an API profile response to form values. */
export function toProfileFormValues(raw: ProfileResponse | null | undefined): ProfileFormValues {
  if (!raw) return { ...EMPTY_PROFILE_FORM };
  return {
    name: raw.name ?? '',
    email: raw.email ?? '',
    bio: raw.bio ?? '',
  };
}

/** Maps form values to the API payload, trimming whitespace. */
export function toProfilePayload(values: ProfileFormValues): ProfilePayload {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    bio: values.bio.trim(),
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates profile form values, returning per-field error messages. */
export function validateProfileForm(values: ProfileFormValues): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Email is invalid';
  }
  return errors;
}

/** True when the validation result contains no errors. */
export function isProfileFormValid(errors: ProfileFieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
