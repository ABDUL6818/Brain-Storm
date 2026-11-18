# Frontend

This document describes the conventions and patterns used in `apps/frontend`. It covers performance (code splitting and memoization), form handling, and error handling. Each section includes short examples and testing notes.

## Table of Contents

- [Route-level Code Splitting & Lazy Loading](#route-level-code-splitting--lazy-loading)
- [Memoization Guidelines](#memoization-guidelines)
- [Form Handling & Validation (Zod + react-hook-form)](#form-handling--validation-zod--react-hook-form)
- [Error Boundary & Toast/Error Helper](#error-boundary--toasterror-helper)
- [Testing Notes](#testing-notes)

---

## Route-level Code Splitting & Lazy Loading

Routes are loaded lazily so that each page is shipped in its own chunk. This keeps the initial bundle small and defers loading of code that the user may never visit.

### Pattern

Use `React.lazy` with a dynamic `import()` for each route, and wrap the router's outlet in a `Suspense` boundary with a fallback UI.

```tsx
// src/routes/index.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageSpinner } from '@/components/PageSpinner';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Settings = lazy(() => import('@/pages/Settings'));
const Reports = lazy(() => import('@/pages/Reports'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

Guidelines:

- Lazy-load at the **route** level (page components), not for small leaf components.
- Each lazily loaded module must have a **default export** (or use `.then(m => ({ default: m.Named }))`).
- Provide a meaningful `Suspense` fallback (spinner/skeleton) to avoid layout shift.
- Keep shared layout, navigation, and providers eagerly imported so they render immediately.

### Measuring bundle size before/after

Capture a baseline before adding lazy loading, then compare after.

```bash
# Build and inspect chunk sizes
npm run build

# Optional: visualize the bundle
npx vite-bundle-visualizer   # or: npx source-map-explorer 'dist/assets/*.js'
```

Record the results (e.g. in the PR description):

| Metric | Before | After |
| --- | --- | --- |
| Initial JS (gzip) | ... | ... |
| Number of chunks | ... | ... |
| Largest chunk (gzip) | ... | ... |

The goal is a smaller initial payload and a reduced largest chunk, with page code moved into route-specific chunks.

---

## Memoization Guidelines

**Profile first.** Only add `useMemo` / `useCallback` / `React.memo` where a measurement shows a real problem. Premature memoization adds complexity and can hurt performance.

### How to measure

1. Use the **React Profiler** in React DevTools (record an interaction, inspect "Why did this render?").
2. Optionally wrap a subtree in `<Profiler>` to log render timings:

```tsx
import { Profiler } from 'react';

<Profiler
  id="ExpensiveTable"
  onRender={(id, phase, actualDuration) => {
    if (actualDuration > 16) console.warn(`[slow] ${id} ${phase}: ${actualDuration}ms`);
  }}
>
  <ExpensiveTable rows={rows} />
</Profiler>
```

### When to memoize

- **`useMemo`** — for expensive derived values (sorting/filtering large lists, heavy transforms) that are recomputed on every render.
- **`useCallback`** — for callbacks passed to memoized children or used in dependency arrays, when identity stability matters.
- **`React.memo`** — for components that re-render with identical props and are shown to be costly in the profiler.

```tsx
// Expensive derived data — memoized because the profiler showed repeated work.
const sortedRows = useMemo(
  () => rows.slice().sort((a, b) => a.name.localeCompare(b.name)),
  [rows],
);

// Stable handler passed to a memoized child.
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

Avoid:

- Memoizing trivial values (string concatenation, simple booleans).
- Adding `useCallback` everywhere "just in case".
- Memoizing values whose dependencies change on every render (no benefit).

---

## Form Handling & Validation (Zod + react-hook-form)

All forms use **react-hook-form** for state and **Zod** for validation, wired together via `@hookform/resolvers/zod`. Validation schemas are **shared** and live in a central location so they can be reused across forms and (where applicable) on the server.

### Shared schemas

```ts
// src/schemas/user.ts
import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  age: z.coerce.number().int().min(18, 'Must be 18 or older'),
});

export type UserFormValues = z.infer<typeof userSchema>;
```

### Form component

```tsx
// src/components/UserForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormValues } from '@/schemas/user';

export function UserForm({ onSubmit }: { onSubmit: (v: UserFormValues) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', age: 18 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input {...register('name')} aria-invalid={!!errors.name} />
      {errors.name && <span role="alert">{errors.name.message}</span>}

      <input {...register('email')} aria-invalid={!!errors.email} />
      {errors.email && <span role="alert">{errors.email.message}</span>}

      <input type="number" {...register('age')} aria-invalid={!!errors.age} />
      {errors.age && <span role="alert">{errors.age.message}</span>}

      <button type="submit" disabled={isSubmitting}>Save</button>
    </form>
  );
}
```

Guidelines:

- Define schemas in `src/schemas/*` and derive types with `z.infer`.
- Always pass `resolver: zodResolver(schema)` to `useForm`.
- Use `defaultValues` to keep inputs controlled and avoid `undefined` warnings.
- Surface validation messages with `role="alert"` for accessibility.
- Reuse the same schema for both client validation and any request payload typing.

---

## Error Boundary & Toast/Error Helper

### ErrorBoundary

A single shared `ErrorBoundary` catches render-time errors in a subtree and shows a fallback instead of crashing the app. Wrap the app root (and optionally individual routes/features).

```tsx
// src/main.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
```

```tsx
// src/components/ErrorBoundary.tsx (usage with custom fallback)
<ErrorBoundary fallback={<p>Something went wrong. Please reload.</p>}>
  <Reports />
</ErrorBoundary>
```

Notes:

- Error boundaries catch errors during **render**, lifecycle, and constructors — not async errors or event handlers. Use the toast helper for those.
- Log caught errors (e.g. to a monitoring service) inside the boundary's `componentDidCatch`.

### Toast / error helper

Use the shared toast helper for user-facing notifications (success, info, and errors from async operations).

```tsx
// src/lib/toast.ts
import { toast } from '@/components/Toaster';

export const notify = {
  success: (msg: string) => toast.success(msg),
  info: (msg: string) => toast.info(msg),
  error: (err: unknown, fallback = 'Something went wrong') => {
    const message = err instanceof Error ? err.message : fallback;
    toast.error(message);
  },
};
```

```tsx
// In an event handler / async call
try {
  await saveUser(values);
  notify.success('Saved');
} catch (err) {
  notify.error(err, 'Failed to save');
}
```

Guidelines:

- Use `notify.error` for async/event-handler failures; use `ErrorBoundary` for render errors.
- Keep messages user-friendly; log technical details separately.
- Do not show raw stack traces or internal error objects to users.

---

## Testing Notes

- **Lazy routes:** Use `findBy*` queries to await the lazy chunk, or wrap renders in `Suspense` with a test fallback. Mock heavy pages where appropriate.
  ```tsx
  render(<AppRoutes />, { wrapper: MemoryRouter });
  expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  ```
- **Memoization:** Behavior must be unchanged. Test observable output, not the number of renders. If needed, assert with a render counter to lock in a measured optimization.
- **Forms:** Test validation by submitting invalid input and asserting `role="alert"` messages; test the success path by submitting valid data and asserting the `onSubmit` callback receives parsed values.
- **ErrorBoundary:** Render a component that throws and assert the fallback is shown (suppress expected `console.error`).
- **Toast helper:** Mock the toast module and assert `notify.error`/`notify.success` are called with the expected messages.

Run the suite:

```bash
npm test