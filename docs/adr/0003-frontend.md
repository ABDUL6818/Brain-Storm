# ADR 0003: Frontend State Management and Data Fetching

## Status

Accepted

## Context

The `apps/frontend` application needs a clear, consistent approach to managing state and fetching data. As the frontend grows, contributors need shared conventions so that:

- Global state (e.g., authentication, user preferences, cross-component UI state) is handled predictably.
- Server data fetching is consistent, testable, and easy to reason about.
- Business logic is separated from React components, making it reusable and unit-testable.
- Tests are written against user-facing behavior rather than implementation details.

Without explicit decisions, contributors risk introducing competing state libraries, ad-hoc `fetch` calls scattered across components, and logic embedded in components that is hard to test or reuse. This ADR captures the decisions so new contributors and API consumers can onboard without tribal knowledge.

## Decision

We adopt the following conventions for `apps/frontend`:

1. **Global state management: Zustand.**
   Use [Zustand](https://github.com/pmndrs/zustand) for shared/global client state. Stores live in a dedicated `store` directory and are consumed via selectors to minimize re-renders.

2. **Data fetching: custom hooks.**
   Server data fetching is encapsulated in custom hooks (e.g., `useUser`, `useProjects`) located in a `hooks` directory. Components consume these hooks rather than calling `fetch`/API clients directly. Hooks own loading, error, and success states.

3. **Pure transforms in utility modules.**
   Data shaping, formatting, and transformation logic lives in pure functions within utility modules (e.g., `utils/`). These functions have no React dependencies and are trivially unit-testable.

4. **Testing: React Testing Library.**
   Component and hook tests use [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to assert on user-observable behavior. Tests avoid reaching into component internals.

### Example: Zustand store

```ts
// store/useAuthStore.ts
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  clear: () => set({ token: null }),
}));
```

Consume with a selector:

```tsx
const token = useAuthStore((state) => state.token);
```

### Example: custom data-fetching hook

```ts
// hooks/useUser.ts
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
}

export function useUser(id: string) {
  const [data, setData] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/users/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json() as Promise<User>;
      })
      .then((user) => {
        if (!cancelled) setData(user);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, error, loading };
}
```

### Example: pure transform utility

```ts
// utils/formatUser.ts
export interface RawUser {
  id: string;
  first_name: string;
  last_name: string;
}

export interface DisplayUser {
  id: string;
  fullName: string;
}

export function formatUser(raw: RawUser): DisplayUser {
  return {
    id: raw.id,
    fullName: `${raw.first_name} ${raw.last_name}`.trim(),
  };
}
```

### Example: React Testing Library test

```tsx
// components/UserCard.test.tsx
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

test('renders the user full name', () => {
  render(<UserCard user={{ id: '1', fullName: 'Ada Lovelace' }} />);
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
});
```

Run the frontend test suite:

```bash
cd apps/frontend
npm test
```

## Rationale

- **Zustand** is minimal, has no boilerplate, works well with React hooks, and avoids the ceremony of larger state libraries while still supporting selectors and middleware.
- **Custom hooks** keep data-fetching concerns colocated and reusable, and make loading/error handling consistent across the app. They are straightforward to test in isolation.
- **Pure transforms** decouple business logic from rendering, enabling fast unit tests and reuse across components and hooks.
- **React Testing Library** encourages tests that reflect how users interact with the UI, reducing brittle tests tied to implementation details.

## Consequences

### Positive

- Consistent patterns reduce onboarding friction and review churn.
- Business logic is testable without rendering components.
- Data fetching is centralized and easier to evolve (e.g., adding caching or retries in one place).

### Negative / Trade-offs

- Contributors must learn the conventions; deviations should be discussed in review.
- Custom hooks may duplicate logic if not factored into shared utilities; reviewers should watch for this.
- Zustand is an added dependency and a deliberate choice over React Context or other libraries.

### Follow-ups

- Document any shared API client used by hooks.
- Consider standardizing error/loading shapes across hooks.

## References

- [Zustand documentation](https://github.com/pmndrs/zustand)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MADR: Markdown Any Decision Records](https://adr.github.io/madr/)
- Related ADRs: see [ADR index](./README.md)