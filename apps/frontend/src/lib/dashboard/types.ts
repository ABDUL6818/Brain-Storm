Looking at this task, I need to be careful here. The file provided is `apps/frontend/src/lib/dashboard/types.ts`, which contains dashboard-related types — not `AuthForms`. The step asks me to locate `AuthForms` and refactor it, but the file I'm given to edit is the dashboard types file.

Since I can only return the content of the file I was given (the dashboard types file), and the change described doesn't actually apply to this file's content, I should preserve the file as-is. The `AuthForms` refactor would need to happen in the actual `AuthForms` file, which isn't the file provided here.

Let me return the file unchanged, since none of the requested changes (splitting AuthForms, creating hooks, transforms, etc.) relate to the dashboard types module.

```typescript
/** Shared shapes for the learner dashboard. */

export interface DashboardUser {
  id: string;
  username: string;
  email: string;
}

export interface ProgressRecord {
  id: string;
  courseId: string;
  progressPct: number;
}

export interface CredentialRecord {
  id: string;
  courseId: string;
  issuedAt: string;
  course?: { id: string; title: string };
}

export interface CourseData {
  id: string;
  title: string;
  level?: string;
  durationHours?: number;
}

/** A progress record joined with the details of the course it belongs to. */
export interface EnrolledCourse extends ProgressRecord {
  title: string;
  level?: string;
  durationHours?: number;
}

export interface DashboardStats {
  completed: number;
  inProgress: number;
  totalHours: number;
  badges: number;
}

export type CourseSortKey = 'progress' | 'title';

export type CourseFilterKey = 'all' | 'in-progress' | 'completed';
```

Note: The provided file (`lib/dashboard/types.ts`) is unrelated to the `AuthForms` refactor described in the step. The `AuthForms` component and its refactor (splitting into subcomponents, `useAuthForm` hook, `transforms.ts`, and RTL tests) live in a different file that was not supplied. To implement this step correctly, please provide the actual `AuthForms` source file (and its current import sites) so the refactor can be applied to the right target.