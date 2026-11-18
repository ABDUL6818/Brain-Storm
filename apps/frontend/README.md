# Frontend

This package contains the web frontend for the application. It is a React + TypeScript application built with Vite and tested with Vitest (unit + smoke render) and Playwright (e2e, including accessibility).

## Getting started

```bash
pnpm install
pnpm dev
```

## Project structure

```
apps/frontend/
├── src/
│   ├── api/          # Single typed API client (see "API client")
│   ├── store/        # Global store/context (see "Global state")
│   ├── components/   # UI components
│   ├── pages/        # Route-level pages
│   └── test/         # Test setup, helpers, a11y utilities
├── e2e/              # Playwright end-to-end + a11y tests
└── README.md
```

## Conventions

The frontend follows a small set of consolidated patterns. Each pattern below is the single approved way to do the corresponding thing; new code should follow it and reviewers should reject deviations.

1. [Dead code policy](#dead-code-policy)
2. [API client](#api-client)
3. [Global state](#global-state)
4. [Accessibility](#accessibility)
5. [Testing](#testing)

---

## Dead code policy

We keep the codebase free of unreferenced files, unused exports, and orphaned assets. This is enforced with [knip](https://github.com/webpro/knip) and reviewed on every change.

### Rules

- **No unreferenced files.** Every file under `src/` must be reachable from an entry point (app entry, route, test, or config).
- **No unused exports.** Export only what is imported elsewhere. Prefer module-private helpers over `export`ing "just in case".
- **No orphaned assets.** Images, fonts, and stylesheets must be imported by a component or referenced from CSS that is itself imported. Delete assets that nothing references.
- **No dead components.** Components that are no longer rendered (and have no tests exercising them) are deleted, not commented out. Git history preserves them if needed.
- **Barrel files are discouraged.** Import from the concrete module path so knip can track usage accurately.

### Running the report

```bash
# From apps/frontend
pnpm knip
```

`pnpm knip` reports unused files, exports, dependencies, and (with the configured plugin) unlisted dependencies. CI runs it in report mode; treat new findings as review blockers.

To auto-fix the safe subset (e.g. removing unused exports where configured):

```bash
pnpm knip --fix
```

Always review the diff from `--fix` before committing — it can remove exports that are only used dynamically.

### When deleting code

1. Run `pnpm knip` and confirm the item is unreferenced.
2. Search the repo (`rg <name>`) to catch dynamic references (string-based imports, route tables, test fixtures).
3. Delete the file/export/asset.
4. Update any affected imports.
5. Run the full test suite (see [Testing](#testing)).

---

## API client

All HTTP calls go through a **single typed `apiClient`**. Components and hooks must never call `fetch`/`axios` directly, and must never construct URLs by hand.

### Location

```
src/api/
├── client.ts       # apiClient instance + Result<T> helpers
├── types.ts        # Request/response DTOs
└── endpoints/      # Typed methods grouped by domain
```

### Usage

```ts
import { apiClient } from '@/api/client';

// Typed method — returns Result<T>, never throws for expected failures
const result = await apiClient.users.getById(userId);

if (result.ok) {
  renderUser(result.value);
} else {
  showError(result.error);
}
```

### `Result<T>` error handling

Every `apiClient` method returns a discriminated union rather than throwing:

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError };

interface ApiError {
  status: number;      // HTTP status, or 0 for network errors
  code: string;        // stable machine-readable code
  message: string;     // human-readable, safe to display
  details?: unknown;   // optional structured payload
}
```

Guidelines:

- **Narrow with `result.ok`.** Do not cast or access `.value` without checking.
- **Never `throw` from a component for an API failure.** Surface it through the store (see [Global state](#global-state)) or local UI state.
- **Map errors to user-facing copy** in one place (the error boundary / toast layer), not at each call site.
- **Add new endpoints as typed methods** on `apiClient`, with DTOs in `types.ts`. Do not add ad-hoc `fetch` calls.

### Adding an endpoint

```ts
// src/api/endpoints/users.ts
import type { User } from '../types';
import type { Result } from '../client';

export const users = {
  getById: (id: string): Promise<Result<User>> =>
    request(`/users/${encodeURIComponent(id)}`),
};
```

Then wire it into the `apiClient` object in `client.ts`. Keep the method signature typed end-to-end.

### Tests

```bash
# Unit tests for the client and endpoint mappers
pnpm test src/api

# Smoke render tests that exercise components consuming the client
pnpm test:smoke
```

Mock the client at the module boundary (`vi.mock('@/api/client')`) in component tests; test the client itself against a mocked transport (MSW or a stubbed `request`).

---

## Global state

Application state lives in **one global store/context**. Components read from it via hooks and write via actions. Prop drilling of shared state is not allowed.

### Location

```
src/store/
├── index.tsx       # Provider + typed hooks
├── state.ts        # State shape + initial state
└── actions.ts      # Action creators / reducers
```

### Pattern

- **One provider** (`<AppStoreProvider>`) mounted once at the app root.
- **Typed hooks** for reading and writing: `useAppState(selector)` and `useAppDispatch()`.
- **Selectors** keep re-renders scoped: subscribe to the smallest slice you need.
- **No redundant local copies.** If a value already lives in the store, do not mirror it into `useState`. Derive it with a selector instead.

### Consuming the store

```tsx
import { useAppState, useAppDispatch } from '@/store';
import { selectCurrentUser } from '@/store/state';
import { logout } from '@/store/actions';

function UserMenu() {
  const user = useAppState(selectCurrentUser);
  const dispatch = useAppDispatch();

  if (!user) return null;
  return <button onClick={() => dispatch(logout())}>Sign out</button>;
}
```

### Rules

- **Read through selectors**, not by destructuring the whole state object.
- **Write through actions**, not by mutating state directly.
- **Keep ephemeral UI state local.** Hover, focus, and open/closed for a single component stay in `useState`; only shared or cross-route state goes in the store.
- **No prop drilling for shared state.** If a value is needed by a descendant that is more than one level down, read it from the store in that descendant.
- **One source of truth.** If you find a `useState` that duplicates a store value, delete the local copy and read from the store.

### Tests

```bash
# Unit tests for reducers, selectors, and hooks
pnpm test src/store

# Smoke render tests that mount components against a test provider
pnpm test:smoke
```

Wrap components under test in the store provider (or a test helper that does so) so hooks resolve. Assert on rendered output, not on internal state shape.

---

## Accessibility

The frontend targets **WCAG 2.1 AA**. Accessibility is verified automatically in unit and e2e tests and reviewed manually for anything automation cannot catch.

### Standard

- **WCAG 2.1 AA** is the bar. Fix violations; do not suppress them without a documented reason.
- **Semantic HTML first.** Use native elements (`button`, `a`, `input`, `label`, `nav`, `main`) before reaching for ARIA. ARIA is a patch, not a substitute.
- **Every interactive element is keyboard reachable** and has a visible focus indicator.
- **Focus order follows visual order.** Do not use positive `tabindex`. Manage focus explicitly on route changes and when opening dialogs (trap focus, restore on close).
- **Every image has an `alt`** (empty `alt=""` for decorative images).
- **Every form control has an associated label** (`<label htmlFor>` or `aria-label` when no visible label is possible).
- **Color contrast meets AA:** 4.5:1 for normal text, 3:1 for large text and UI component boundaries. Use the design tokens below rather than hard-coded colors.

### Tokens

Contrast and focus styling come from shared tokens, not per-component values:

- **Color tokens** (`--color-text`, `--color-text-muted`, `--color-bg`, `--color-border`, `--color-focus`) are defined once and meet AA against their intended backgrounds. Do not introduce raw hex values in components.
- **Focus token** (`--focus-ring`) defines the visible focus ring. Do not set `outline: none` without providing an equivalent visible indicator.

### Automated checks

Unit tests run `axe-core` against rendered components via the shared helper:

```ts
// src/test/a11y.ts
import { axe } from 'jest-axe';

export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}
```

E2E tests run `@axe-core/playwright` against each route:

```ts
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();
expect(results.violations).toEqual([]);
```

### Tests

```bash
# Unit + smoke render tests, including axe assertions
pnpm test
pnpm test:smoke

# E2E, including the a11y suite
pnpm test:e2e
pnpm test:e2e --grep @a11y
```

Any new component with interactive elements or non-trivial markup should have an axe assertion in its unit test. Any new route should be covered by the e2e a11y suite.

---

## Testing

| Command | What it runs |
| --- | --- |
| `pnpm test` | Vitest unit tests (includes axe assertions) |
| `pnpm test:smoke` | Smoke render tests — mount key components/pages and assert they render without errors |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm test:e2e --grep @a11y` | Playwright accessibility suite only |
| `pnpm knip` | Dead-code / unused-export report |

Run `pnpm test` and `pnpm test:smoke` before every commit; run `pnpm test:e2e` before opening a PR that touches routing, the API client, the store, or shared components. CI runs all of the above.

### Smoke render tests

Smoke tests mount a component or page with representative props/state and assert it renders without throwing. They are the minimum bar for any new component and catch missing providers, broken imports, and runtime errors that unit tests miss.

```tsx
import { renderWithProviders } from '@/test/render';

it('renders the user menu', () => {
  const { getByRole } = renderWithProviders(<UserMenu />);
  expect(getByRole('button', { name: /sign out/i })).toBeInTheDocument();
});
```

`renderWithProviders` wraps the tree in the store provider and any other required context so components can be tested in isolation.