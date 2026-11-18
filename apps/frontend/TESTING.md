# Frontend Testing Guide

Comprehensive guide for unit testing React components and hooks in the Brain-Storm platform.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

We use Vitest with React Testing Library for unit testing frontend components and hooks. Tests ensure components render correctly, handle user interactions, and maintain consistent behavior across changes.

### Test Coverage Goals

- **Components**: 70% coverage minimum
- **Hooks**: 80% coverage minimum
- **Utils**: 85% coverage minimum
- **Critical paths**: 100% coverage

## Testing Stack

### Core Libraries

- **Vitest**: Fast unit test framework
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom DOM matchers
- **happy-dom/jsdom**: DOM implementation for Node.js

### Additional Tools

- **MSW (Mock Service Worker)**: API mocking
- **Zod**: Schema validation testing
- **Zustand**: State management testing

## Running Tests

### All Tests

\`\`\`bash

# Run all tests

npm run test

# Run with coverage

npm run test:coverage

# Watch mode

npm run test:watch

# UI mode (interactive)

npm run test:ui
\`\`\`

### Specific Tests

\`\`\`bash

# Run specific file

npm run test -- src/**tests**/hooks/useWallet.test.ts

# Run tests matching pattern

npm run test -- --grep="useNotifications"

# Run only changed tests

npm run test -- --changed

# Run a single component's tests (e.g. after splitting CourseList)

npm run test -- src/**tests**/components/CourseList

# Run a single hook's tests

npm run test -- src/**tests**/hooks/useCourseList.test.ts

# Run a single utility module's tests

npm run test -- src/**tests**/utils/courseList.test.ts
\`\`\`

### CI/CD

Tests run automatically on:

- Every commit
- Pull requests
- Pre-merge validation

## Writing Tests

### Component Tests

#### Basic Component Test

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button Component', () => {
it('renders with text', () => {
render(<Button>Click me</Button>);
expect(screen.getByText('Click me')).toBeInTheDocument();
});

it('calls onClick when clicked', async () => {
const mockClick = vi.fn();
render(<Button onClick={mockClick}>Click me</Button>);

    await userEvent.click(screen.getByText('Click me'));
    expect(mockClick).toHaveBeenCalledOnce();

});
});
\`\`\`

#### Component with Props

\`\`\`typescript
describe('CourseCard', () => {
const mockCourse = {
id: '1',
title: 'Blockchain 101',
instructor: 'John Doe',
price: 49.99,
};

it('displays course information', () => {
render(<CourseCard course={mockCourse} />);

    expect(screen.getByText('Blockchain 101')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();

});

it('handles enrollment', async () => {
const mockEnroll = vi.fn();
render(<CourseCard course={mockCourse} onEnroll={mockEnroll} />);

    await userEvent.click(screen.getByText('Enroll'));
    expect(mockEnroll).toHaveBeenCalledWith(mockCourse.id);

});
});
\`\`\`

### Presentational Subcomponents

When a container component (e.g. `CourseList`) is split into presentational
subcomponents plus a custom hook, test each piece in isolation:

- **Presentational subcomponents**: render them with plain props and assert on
  the rendered output. No data fetching or hooks involved.
- **Custom hook**: test with `renderHook` and mock the data source.
- **Container/wrapper**: test the thin wrapper only for wiring (that it passes
  props through and renders the expected subcomponents).

\`\`\`typescript
// Presentational subcomponent — pure props in, DOM out
describe('CourseListEmpty', () => {
it('renders the empty state message', () => {
render(<CourseListEmpty message="No courses yet" />);
expect(screen.getByText('No courses yet')).toBeInTheDocument();
});
});

// Custom hook — mock the data source, assert on returned state
describe('useCourseList', () => {
it('returns courses from the data source', async () => {
vi.mock('@/lib/courseApi', () => ({
fetchCourses: vi.fn().mockResolvedValue([{ id: '1', title: 'Blockchain 101' }]),
}));

    const { result } = renderHook(() => useCourseList());

    await waitFor(() => {
      expect(result.current.courses).toHaveLength(1);
    });
    expect(result.current.isLoading).toBe(false);

});
});
\`\`\`

### Pure Utility Tests

Data transforms extracted from components into utility modules should be tested
directly as pure functions — no rendering required.

\`\`\`typescript
import { transformCourses, filterCourses } from '@/utils/courseList';

describe('courseList utils', () => {
it('transforms raw courses into view models', () => {
const result = transformCourses([{ id: '1', title: 'A', price: 10 }]);
expect(result).toEqual([{ id: '1', title: 'A', formattedPrice: '$10.00' }]);
});

it('filters courses by search term', () => {
const courses = [{ id: '1', title: 'Blockchain' }, { id: '2', title: 'React' }];
expect(filterCourses(courses, 'block')).toHaveLength(1);
});
});
\`\`\`

### Hook Tests

#### Basic Hook Test

\`\`\`typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
it('increments counter', () => {
const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);

});
});
\`\`\`

#### Hook with Parameters

\`\`\`typescript
describe('useDebounce', () => {
beforeEach(() => {
vi.useFakeTimers();
});

afterEach(() => {
vi.useRealTimers();
});

it('debounces value changes', async () => {
const { result, rerender } = renderHook(
({ value, delay }) => useDebounce(value, delay),
{ initialProps: { value: 'initial', delay: 500 } }
);

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current).toBe('updated');
    });

});
});
\`\`\`

### Form Validation Tests

\`\`\`typescript
describe('LoginForm Validation', () => {
it('validates email format', async () => {
render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid-email');

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();

});

it('validates password length', async () => {
render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(passwordInput, 'short');

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();

});
});
\`\`\`

### Async Tests

\`\`\`typescript
describe('DataFetching Component', () => {
it('displays loading state', () => {
render(<DataFetching />);
expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

it('displays data after fetch', async () => {
render(<DataFetching />);

    await waitFor(() => {
      expect(screen.getByText(/data loaded/i)).toBeInTheDocument();
    });

});

it('handles error states', async () => {
// Mock API error
server.use(
rest.get('/api/data', (req, res, ctx) => {
return res(ctx.status(500));
})
);

    render(<DataFetching />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

});
});
\`\`\`

## Coverage Requirements

### Enforcement

Coverage thresholds are enforced in CI:

\`\`\`typescript
// vitest.config.ts
coverage: {
thresholds: {
lines: 70,
functions: 70,
branches: 65,
statements: 70,
},
}
\`\`\`

### Checking Coverage

\`\`\`bash

# Generate coverage report

npm run test:coverage

# View HTML report

open coverage/index.html
\`\`\`

### Coverage Reports

- **Terminal**: Inline coverage summary
- **LCOV**: For CI/CD integration
- **HTML**: Interactive browsing
- **JSON**: Programmatic analysis

### Coverage for Refactored Components

When a component is split into subcomponents + a hook + utilities (e.g.
`CourseList`), each new module needs its own tests. Aim for 85%+ coverage on
the new modules. To check coverage for just the refactored area:

\`\`\`bash
npm run test:coverage -- src/components/CourseList src/hooks/useCourseList.ts src/utils/courseList.ts
\`\`\`

## Best Practices

### Do's ✅

1. **Test User Behavior**: Test what users see and do
2. **Use Accessible Queries**: Prefer `getByRole`, `getByLabelText`
3. **Test Edge Cases**: Empty states, errors, loading
4. **Keep Tests Simple**: One concept per test
5. **Use Setup/Teardown**: Clean state between tests
6. **Mock External Dependencies**: APIs, timers, storage
7. **Test Accessibility**: ARIA attributes, keyboard navigation

### Don'ts ❌

1. **Don't Test Implementation**: Test behavior, not internals
2. **Don't Use Brittle Selectors**: Avoid `.class` or `#id`
3. **Don't Test Libraries**: Trust that libraries work
4. **Don't Skip Cleanup**: Always cleanup after tests
5. **Don't Make Tests Dependent**: Each test should be independent
6. **Don't Ignore Warnings**: Fix console errors and warnings

### Testing Patterns

#### Arrange-Act-Assert (AAA)

\`\`\`typescript
it('increments counter on click', async () => {
// Arrange
render(<Counter />);
const button = screen.getByText('Increment');

// Act
await userEvent.click(button);

// Assert
expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
\`\`\`

#### Setup Helpers

\`\`\`typescript
function renderWithProviders(ui: React.ReactElement) {
return render(
<QueryClientProvider client={queryClient}>
<ThemeProvider>
{ui}
</ThemeProvider>
</QueryClientProvider>
);
}

it('renders with theme', () => {
renderWithProviders(<MyComponent />);
// assertions...
});
\`\`\`

#### Testing a Split Component (Container + Subcomponents + Hook)

When a component is refactored into a thin container, presentational
subcomponents, a custom hook, and utilities, test each layer separately:

\`\`\`typescript
// 1. Utilities — pure functions, no rendering
describe('courseList utils', () => {
it('sorts courses by title', () => {
expect(sortCourses([{ title: 'B' }, { title: 'A' }])[0].title).toBe('A');
});
});

// 2. Hook — mock the data source
describe('useCourseList', () => {
it('exposes loading then data', async () => {
const { result } = renderHook(() => useCourseList());
expect(result.current.isLoading).toBe(true);
await waitFor(() => expect(result.current.isLoading).toBe(false));
});
});

// 3. Subcomponent — props in, DOM out
describe('CourseListEmpty', () => {
it('renders empty message', () => {
render(<CourseListEmpty message="No courses" />);
expect(screen.getByText('No courses')).toBeInTheDocument();
});
});

// 4. Container — verify wiring only
describe('CourseList', () => {
it('renders subcomponents from hook data', async () => {
render(<CourseList />);
await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument());
});
});
\`\`\`

#### Custom Matchers

\`\`\`typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveClass('active');
expect(element).toHaveAttribute('aria-label', 'Close');
expect(input).toHaveValue('test');
expect(checkbox).toBeChecked();
\`\`\`

## Mocking

### API Mocking with MSW

\`\`\`typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
rest.get('/api/courses', (req, res, ctx) => {
return res(ctx.json({ courses: [] }));
})
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

### Module Mocking

\`\`\`typescript
vi.mock('@/lib/walletApi', () => ({
connectWallet: vi.fn().mockResolvedValue({ address: '0x123' }),
getBalance: vi.fn().mockResolvedValue('100'),
}));
\`\`\`

### Timer Mocking

\`\`\`typescript
beforeEach(() => {
vi.useFakeTimers();
});

afterEach(() => {
vi.useRealTimers();
});

it('delays execution', () => {
const callback = vi.fn();
setTimeout(callback, 1000);

vi.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();
});
\`\`\`

## Troubleshooting

### Common Issues

#### Tests Failing Randomly

**Cause**: Async timing, shared state, or race conditions

**Solution**:
\`\`\`typescript
// Use waitFor for async assertions
await waitFor(() => {
expect(element).toBeInTheDocument();
});

// Clear mocks between tests
beforeEach(() => {
vi.clearAllMocks();
});
\`\`\`

#### Act Warnings

**Cause**: State updates not wrapped in act()

**Solution**:
\`\`\`typescript
await act(async () => {
fireEvent.click(button);
});
\`\`\`

#### Memory Leaks

**Cause**: Timers, listeners, or subscriptions not cleaned up

**Solution**:
\`\`\`typescript
afterEach(() => {
cleanup();
vi.clearAllTimers();
});
\`\`\`

### Debugging Tests

\`\`\`typescript
// Debug output
screen.debug(); // Prints DOM
console.log(prettyDOM(element)); // Prints specific element

// Query debugging
screen.getByText('text'); // Throws helpful error if not found
screen.queryByText('text'); // Returns null if not found
screen.findByText('text'); // Async query with retry
\`\`\`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MSW Documentation](https://mswjs.io/)

## Support

For help with testing:

1. Check this guide
2. Review existing tests for examples
3. Ask in #frontend-testing channel
4. Create GitHub issue with `testing` label

---

**Last Updated**: 2026-06-29  
**Maintainer**: Brain-Storm Frontend Team
