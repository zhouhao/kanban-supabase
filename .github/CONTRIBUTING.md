# Contributing to Xiandan Kanban

Thank you for your interest in contributing to Xiandan Kanban! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Continuous Integration](#continuous-integration)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)

## Code of Conduct

Please be respectful and constructive in all interactions with the project and community.

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 10+
- Git

### Setup Development Environment

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/kanban-supabase.git
cd kanban-supabase
```

2. Install dependencies:

```bash
cd xiandan-kanban-app
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Start the development server:

```bash
pnpm dev
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Follow the existing code style
- Write tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run tests
pnpm test

# Run type checking
pnpm exec tsc --noEmit

# Run linter
pnpm lint

# Run all checks (simulates CI)
pnpm exec tsc --noEmit && pnpm lint && pnpm test:run
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git commit -m "feat: add user profile settings"
git commit -m "fix: resolve drag-and-drop issue in Safari"
git commit -m "docs: update API documentation"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting, etc.)
- `chore:` - Maintenance tasks

## Testing

### Running Tests

```bash
# Watch mode (recommended during development)
pnpm test

# Run once
pnpm test:run

# With UI
pnpm test:ui

# With coverage
pnpm test:coverage
```

### Writing Tests

- Place test files in `__tests__` directories next to the code they test
- Use descriptive test names that explain what is being tested
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies (Supabase, APIs, etc.)

**Example:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
  })

  it('should render correctly', () => {
    // Arrange: Set up test data
    // Act: Execute the code
    // Assert: Verify the results
  })
})
```

See [TESTING.md](../xiandan-kanban-app/TESTING.md) for comprehensive testing guidelines.

## Continuous Integration

### GitHub Actions Workflow

All pull requests and pushes to main branches trigger the CI pipeline:

1. **Type Checking** - TypeScript compilation check
2. **Linting** - Code quality checks
3. **Unit Tests** - All tests must pass
4. **Coverage** - Generate and upload coverage reports

**Status Check**: Your PR must pass all CI checks before merging.

### Viewing CI Results

- Check the **Actions** tab on GitHub
- View the status badge on your PR
- Review coverage reports in PR comments

### Local CI Simulation

Before pushing, run the full CI suite locally:

```bash
cd xiandan-kanban-app
pnpm exec tsc --noEmit && pnpm lint && pnpm test:run && pnpm test:coverage
```

## Pull Request Process

### 1. Ensure All Checks Pass

- ✅ All tests pass (`pnpm test:run`)
- ✅ Type checking passes (`pnpm exec tsc --noEmit`)
- ✅ Linting passes (`pnpm lint`)
- ✅ Coverage maintained or improved
- ✅ Documentation updated (if needed)

### 2. Create a Pull Request

1. Push your branch to your fork
2. Open a pull request against `master` or `develop`
3. Fill out the PR template with:
   - Clear description of changes
   - Link to related issues
   - Screenshots (if UI changes)
   - Testing notes

### 3. PR Title Format

Use conventional commit format for PR titles:

```
feat: add dark mode toggle
fix: resolve authentication redirect loop
docs: update installation guide
test: add unit tests for task store
```

### 4. Review Process

- Address review feedback promptly
- Keep the PR focused on a single concern
- Update tests if implementation changes
- Rebase if needed to resolve conflicts

### 5. After Approval

Once approved and all checks pass, a maintainer will merge your PR.

## Code Style

### TypeScript

- Use TypeScript for all new code
- Define interfaces for data structures
- Avoid `any` types - use proper typing
- Use type inference where possible

### React

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper TypeScript types for props

### State Management

- Use Zustand for global state
- Keep store logic simple and testable
- Mock stores in tests

### Styling

- Use Tailwind CSS utility classes
- Follow existing component patterns
- Ensure responsive design
- Test in multiple browsers

### File Organization

```
src/
  components/
    FeatureName/
      FeatureName.tsx
      FeatureSubComponent.tsx
      __tests__/
        FeatureName.test.tsx
  stores/
    featureStore.ts
    __tests__/
      featureStore.test.ts
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Stores**: camelCase with `Store` suffix (`authStore.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Implement the feature with tests
3. Update documentation
4. Submit PR

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Ensure the test passes
4. Submit PR with test and fix

### Updating Dependencies

1. Update `package.json`
2. Run `pnpm install`
3. Test thoroughly
4. Check for breaking changes
5. Update migration notes if needed

## Getting Help

- 📖 Read the [Documentation](../xiandan-kanban-app/CLAUDE.md)
- 🧪 Check the [Testing Guide](../xiandan-kanban-app/TESTING.md)
- 🐛 Search existing [Issues](https://github.com/zhouhao/kanban-supabase/issues)
- 💬 Open a new issue for questions

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to Xiandan Kanban! 🎉
