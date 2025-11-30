# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Xiandan Kanban project.

## Overview

The project uses **GitHub Actions** for automated testing, linting, type checking, and coverage reporting. The CI pipeline ensures code quality and prevents regressions before code is merged.

## Workflows

### Test Workflow

**File**: `.github/workflows/test.yml`

**Purpose**: Automated testing and quality checks

**Triggers**:
- Push to `master`, `main`, or `develop` branches
- Pull requests targeting `master`, `main`, or `develop` branches
- Manual trigger via `workflow_dispatch`
- Only runs when files in `xiandan-kanban-app/` or the workflow itself change

**Jobs**:

#### 1. Run Unit Tests

**Environment**:
- OS: Ubuntu Latest
- Node.js: 20.x
- Package Manager: pnpm 10

**Steps**:

1. **Checkout code** - Clones the repository
2. **Setup pnpm** - Installs pnpm package manager
3. **Setup Node.js** - Configures Node.js with pnpm caching
4. **Install dependencies** - Runs `pnpm install --frozen-lockfile`
5. **Type checking** - Runs `tsc --noEmit` to verify TypeScript
6. **Linting** - Runs `pnpm lint` to check code quality
7. **Unit tests** - Runs `pnpm test:run` to execute all tests
8. **Coverage** - Generates coverage report with `pnpm test:coverage`
9. **Upload to Codecov** - Uploads coverage data (if token configured)
10. **Archive coverage** - Saves coverage report as artifact
11. **PR comment** - Posts test results as comment on pull requests

## Status Checks

### Required Checks

All pull requests must pass these checks before merging:

- ✅ Type Checking (TypeScript compilation)
- ✅ Linting (ESLint)
- ✅ Unit Tests (Vitest)
- ✅ Coverage Generation

### Optional Checks

- 📊 Codecov Upload (requires `CODECOV_TOKEN` secret)

## Artifacts

### Coverage Report

**Retention**: 30 days

**Location**: Downloadable from Actions run page

**Contents**:
- HTML coverage report
- JSON coverage data
- Coverage summary

**Access**: Available for all workflow runs, even failed ones (`if: always()`)

## Pull Request Integration

### Automated Comments

For pull requests, the workflow automatically posts a comment with:

- ✅ Test status
- 📊 Coverage summary table
- 📈 Detailed coverage metrics

**Example Comment**:

```markdown
## 🧪 Test Results

✅ All tests passed!

### Coverage Summary
| Category | Percentage |
|----------|------------|
| Statements | 85.7% |
| Branches | 78.3% |
| Functions | 92.1% |
| Lines | 84.9% |
```

### Status Badge

The README displays a real-time status badge:

```markdown
[![Unit Tests](https://github.com/zhouhao/kanban-supabase/actions/workflows/test.yml/badge.svg)](https://github.com/zhouhao/kanban-supabase/actions/workflows/test.yml)
```

## Configuration

### Secrets

Configure these secrets in GitHub repository settings:

| Secret | Required | Description |
|--------|----------|-------------|
| `CODECOV_TOKEN` | Optional | Token for uploading coverage to Codecov |

### Environment Variables

No environment variables required for CI. Tests run with mocked Supabase client.

## Local CI Simulation

Run the same checks locally before pushing:

```bash
cd xiandan-kanban-app

# Full CI check
pnpm exec tsc --noEmit && \
pnpm lint && \
pnpm test:run && \
pnpm test:coverage

# Or individual checks
pnpm exec tsc --noEmit    # Type checking
pnpm lint                  # Linting
pnpm test:run             # Tests
pnpm test:coverage        # Coverage
```

## Codecov Integration (Optional)

### Setup

1. Go to [codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Add the repository
4. Copy the upload token
5. Add token to GitHub Secrets as `CODECOV_TOKEN`

### Benefits

- Coverage tracking over time
- Coverage diff on pull requests
- Coverage badge for README
- Detailed coverage reports

### Badge

After setup, add to README:

```markdown
[![codecov](https://codecov.io/gh/zhouhao/kanban-supabase/branch/master/graph/badge.svg)](https://codecov.io/gh/zhouhao/kanban-supabase)
```

## Workflow Optimization

### Caching

The workflow uses pnpm caching to speed up dependency installation:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
    cache-dependency-path: xiandan-kanban-app/pnpm-lock.yaml
```

**Benefits**:
- Faster CI runs
- Reduced bandwidth usage
- More consistent builds

### Path Filtering

Workflow only runs when relevant files change:

```yaml
paths:
  - 'xiandan-kanban-app/**'
  - '.github/workflows/test.yml'
```

**Benefits**:
- Saves CI minutes
- Faster feedback
- Only runs when necessary

## Troubleshooting

### Test Failures

If tests fail in CI but pass locally:

1. Check Node.js version matches (20.x)
2. Ensure `pnpm-lock.yaml` is committed
3. Clear local cache: `pnpm clean && pnpm install`
4. Check for environment-specific issues

### Type Checking Failures

TypeScript errors in CI:

1. Run `pnpm exec tsc --noEmit` locally
2. Fix all type errors
3. Ensure `tsconfig.json` is committed
4. Check for missing type definitions

### Linting Failures

ESLint errors in CI:

1. Run `pnpm lint` locally
2. Auto-fix: `pnpm lint --fix` (if available)
3. Fix remaining issues manually
4. Ensure `.eslintrc` is committed

### Coverage Upload Failures

Codecov upload issues:

1. Verify `CODECOV_TOKEN` is set correctly
2. Check token has repository access
3. Review Codecov action logs
4. Note: Upload failures don't fail CI (`fail_ci_if_error: false`)

## Maintenance

### Updating Dependencies

When updating GitHub Actions:

```yaml
# Check for latest versions
- uses: actions/checkout@v4          # Update v3 → v4
- uses: actions/setup-node@v4        # Update v3 → v4
- uses: pnpm/action-setup@v4         # Update v2 → v4
```

### Adding New Checks

To add a new CI step:

1. Edit `.github/workflows/test.yml`
2. Add new step in appropriate position
3. Test locally first
4. Commit and verify in CI

## Monitoring

### Viewing Workflow Runs

1. Go to repository **Actions** tab
2. Click on **Unit Tests** workflow
3. View all runs, status, and logs

### Viewing Coverage Trends

1. Visit Codecov dashboard (if configured)
2. View coverage graphs
3. Compare pull request coverage

### Email Notifications

GitHub sends notifications for:
- Failed workflow runs on your branches
- Failed runs on default branch (if you're watching)

Configure in GitHub notification settings.

## Best Practices

### For Contributors

1. **Run CI locally before pushing**
   ```bash
   pnpm exec tsc --noEmit && pnpm lint && pnpm test:run
   ```

2. **Keep tests fast** - CI should complete in < 5 minutes

3. **Maintain coverage** - Don't decrease test coverage

4. **Fix broken builds immediately** - Don't commit on top of failures

### For Maintainers

1. **Require status checks** - Enable in branch protection rules

2. **Review coverage reports** - Check PR coverage comments

3. **Monitor workflow costs** - Keep an eye on Action minutes

4. **Update dependencies regularly** - Keep Actions up to date

## Future Improvements

Potential enhancements:

- [ ] Add end-to-end tests with Playwright
- [ ] Deploy preview environments for PRs
- [ ] Add performance benchmarking
- [ ] Implement automatic dependency updates
- [ ] Add security scanning (Dependabot, CodeQL)
- [ ] Create deployment workflows
- [ ] Add release automation

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Action Setup](https://github.com/pnpm/action-setup)
- [Codecov Action](https://github.com/codecov/codecov-action)
- [Vitest Documentation](https://vitest.dev/)

---

Last Updated: 2025-01-29
