# Testing Guide

This document provides guidelines for writing and running tests in the xiandan-kanban-app project.

## Table of Contents

- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Mocking Guidelines](#mocking-guidelines)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Test Stack

The project uses the following testing tools:

- **Vitest**: Fast unit test framework compatible with Vite
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom DOM matchers for better assertions
- **@testing-library/user-event**: Simulate user interactions
- **jsdom**: Browser environment for testing

## Running Tests

### Available Commands

```bash
# Run tests in watch mode (recommended during development)
pnpm test

# Run tests with UI interface
pnpm test:ui

# Run tests once (for CI/CD)
pnpm test:run

# Run tests with coverage report
pnpm test:coverage
```

### Watch Mode

In watch mode, tests will re-run automatically when files change:

```bash
pnpm test
```

Press `h` in the terminal to see all available commands.

### UI Mode

For a visual testing experience:

```bash
pnpm test:ui
```

This opens a browser-based UI showing test results, coverage, and more.

### Coverage Report

Generate a coverage report:

```bash
pnpm test:coverage
```

Coverage reports are generated in the `coverage/` directory (excluded from git).

## Writing Tests

### Test File Naming

Test files should be placed in a `__tests__` directory next to the code they test:

```
src/
  stores/
    authStore.ts
    __tests__/
      authStore.test.ts
  components/
    Dashboard/
      Dashboard.tsx
      __tests__/
        Dashboard.test.tsx
```

Alternatively, you can name test files with the `.test.ts` or `.test.tsx` suffix:

```
src/
  stores/
    authStore.ts
    authStore.test.ts
```

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Component/Function Name', () => {
  beforeEach(() => {
    // Reset state before each test
  })

  it('should do something specific', () => {
    // Arrange: Set up test data and mocks
    // Act: Execute the code under test
    // Assert: Verify the results
  })
})
```

### Testing Zustand Stores

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMyStore } from '../myStore'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      // ... other methods
    })),
  },
}))

describe('myStore', () => {
  beforeEach(() => {
    // Reset store state
    useMyStore.setState({
      items: [],
      loading: false,
      error: null,
    })
    // Clear mocks
    vi.clearAllMocks()
  })

  it('should fetch items successfully', async () => {
    // Test implementation
  })
})
```

### Testing React Components

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    const button = screen.getByRole('button', { name: 'Click me' })
    await user.click(button)

    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

## Test Structure

### Arrange-Act-Assert Pattern

Follow the AAA pattern for clear, readable tests:

```typescript
it('should update board name', async () => {
  // Arrange: Set up initial state and mocks
  useBoardStore.setState({ boards: [mockBoard] })
  vi.mocked(supabase.from).mockImplementation(mockUpdate)

  // Act: Execute the function being tested
  await useBoardStore.getState().updateBoard('board-1', { name: 'New Name' })

  // Assert: Verify the expected outcomes
  expect(useBoardStore.getState().boards[0].name).toBe('New Name')
  expect(useBoardStore.getState().error).toBe(null)
})
```

### Test Groups

Use `describe` blocks to group related tests:

```typescript
describe('boardStore', () => {
  describe('fetchBoards', () => {
    it('should fetch boards successfully', () => {})
    it('should handle fetch errors', () => {})
  })

  describe('createBoard', () => {
    it('should create board successfully', () => {})
    it('should return null on error', () => {})
  })
})
```

## Mocking Guidelines

### Mocking Supabase

The project uses a centralized Supabase mock in `src/test/mocks/supabase.ts`:

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      // ... other auth methods
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      // ... other query methods
    })),
  },
}))
```

### Mocking Implementation for Specific Tests

```typescript
// Mock a successful response
vi.mocked(supabase.from).mockImplementation(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: mockData,
    error: null
  }),
}))

// Mock an error response
vi.mocked(supabase.from).mockImplementation(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: null,
    error: { message: 'Not found' }
  }),
}))
```

### Mocking External Libraries

```typescript
// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-id' }),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date) => '2024-01-01',
}))
```

## Best Practices

### 1. Test Behavior, Not Implementation

❌ Bad: Testing internal implementation details
```typescript
it('should call setState', () => {
  const setStateSpy = vi.spyOn(store, 'setState')
  store.updateBoard('id', { name: 'New' })
  expect(setStateSpy).toHaveBeenCalled()
})
```

✅ Good: Testing observable behavior
```typescript
it('should update board name', async () => {
  await store.updateBoard('id', { name: 'New' })
  expect(store.getState().boards[0].name).toBe('New')
})
```

### 2. Use Descriptive Test Names

❌ Bad: Vague test names
```typescript
it('works', () => {})
it('test 1', () => {})
```

✅ Good: Descriptive test names
```typescript
it('should successfully sign in user with valid credentials', () => {})
it('should return error when email already exists', () => {})
```

### 3. One Assertion Per Test (When Possible)

❌ Bad: Testing multiple unrelated things
```typescript
it('should do everything', async () => {
  await store.createBoard(data)
  expect(store.boards).toHaveLength(1)

  await store.deleteBoard('id')
  expect(store.boards).toHaveLength(0)

  await store.fetchBoards('user-id')
  expect(store.loading).toBe(false)
})
```

✅ Good: Focused tests
```typescript
it('should add board to state after creation', async () => {
  await store.createBoard(data)
  expect(store.boards).toHaveLength(1)
})

it('should remove board from state after deletion', async () => {
  await store.deleteBoard('id')
  expect(store.boards).toHaveLength(0)
})
```

### 4. Clean Up After Tests

```typescript
beforeEach(() => {
  // Reset state before each test
  useMyStore.setState({ items: [], loading: false, error: null })

  // Clear all mocks
  vi.clearAllMocks()
})

afterEach(() => {
  // Clean up subscriptions, timers, etc.
  vi.restoreAllMocks()
})
```

### 5. Test Error Cases

Always test both success and error scenarios:

```typescript
describe('fetchBoards', () => {
  it('should fetch boards successfully', async () => {
    // Test happy path
  })

  it('should handle network errors', async () => {
    // Test error case
  })

  it('should handle empty results', async () => {
    // Test edge case
  })
})
```

### 6. Use Test Data Builders

Create reusable test data:

```typescript
// testHelpers.ts
export const createMockBoard = (overrides = {}): Board => ({
  id: 'board-123',
  name: 'Test Board',
  description: 'Test description',
  user_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// In tests
it('should update board', async () => {
  const board = createMockBoard({ name: 'Old Name' })
  // ... test code
})
```

## Examples

### Example 1: Testing Async Store Actions

```typescript
it('should create board and update state', async () => {
  const newBoard = createMockBoard()

  vi.mocked(supabase.from).mockImplementation(() => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: newBoard, error: null }),
  }))

  const store = useBoardStore.getState()
  const result = await store.createBoard({
    name: 'Test Board',
    description: null,
    user_id: 'user-123',
  })

  expect(result).toEqual(newBoard)
  expect(useBoardStore.getState().boards).toContainEqual(newBoard)
  expect(useBoardStore.getState().loading).toBe(false)
})
```

### Example 2: Testing React Components with State

```typescript
it('should display board name', () => {
  useBoardStore.setState({
    boards: [createMockBoard({ name: 'My Kanban Board' })],
  })

  render(<Dashboard />)

  expect(screen.getByText('My Kanban Board')).toBeInTheDocument()
})
```

### Example 3: Testing User Interactions

```typescript
it('should create board when form is submitted', async () => {
  const user = userEvent.setup()
  render(<CreateBoardModal />)

  await user.type(screen.getByLabelText('Board Name'), 'New Project')
  await user.type(screen.getByLabelText('Description'), 'Project description')
  await user.click(screen.getByRole('button', { name: 'Create' }))

  await waitFor(() => {
    expect(useBoardStore.getState().boards).toHaveLength(1)
  })
})
```

## Continuous Integration

### GitHub Actions

This project includes a GitHub Actions workflow that automatically runs tests on every push and pull request.

**Workflow File**: `.github/workflows/test.yml`

The CI pipeline performs the following checks:

1. **Type Checking** - Runs `tsc --noEmit` to catch type errors
2. **Linting** - Runs ESLint to enforce code quality standards
3. **Unit Tests** - Runs all tests with `pnpm test:run`
4. **Coverage** - Generates coverage reports
5. **Coverage Upload** - Uploads coverage to Codecov (optional)

**View Status**: Check the status badge at the top of the README or visit the Actions tab on GitHub.

### Running Tests in CI/CD

Tests are designed to run in any CI/CD environment:

```bash
# CI command
pnpm test:run
```

This command:
- Runs all tests once (no watch mode)
- Exits with error code if tests fail
- Perfect for GitHub Actions, GitLab CI, etc.

### Setting Up Codecov (Optional)

To enable coverage reporting:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Add `CODECOV_TOKEN` to GitHub repository secrets
4. Coverage will be automatically uploaded on each CI run

### Workflow Triggers

The test workflow runs on:
- **Push** to `master`, `main`, or `develop` branches (when files in `xiandan-kanban-app/` change)
- **Pull Requests** to `master`, `main`, or `develop` branches
- **Manual trigger** via workflow_dispatch

### Local CI Simulation

To simulate the CI environment locally:

```bash
# Run the full CI check locally
pnpm exec tsc --noEmit && pnpm lint && pnpm test:run && pnpm test:coverage
```

## Troubleshooting

### Tests Timing Out

If tests are timing out, increase the timeout:

```typescript
it('should complete long operation', async () => {
  // Test code
}, 10000) // 10 second timeout
```

### Mock Not Working

Ensure mocks are defined before imports:

```typescript
// ✅ Correct order
vi.mock('@/lib/supabase', () => ({...}))
import { supabase } from '@/lib/supabase'

// ❌ Wrong order
import { supabase } from '@/lib/supabase'
vi.mock('@/lib/supabase', () => ({...}))
```

### State Persisting Between Tests

Always reset state in `beforeEach`:

```typescript
beforeEach(() => {
  useMyStore.setState({ /* reset to initial state */ })
  vi.clearAllMocks()
})
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
