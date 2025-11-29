# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

咸蛋快板 (Xiandan Kanban) is a web-based Kanban board management application built with React, TypeScript, and Supabase. The application enables users to create multiple boards, manage tasks across columns, and receive email reminders.

**Working Directory**: The main application is located in `xiandan-kanban/xiandan-kanban-app/`

## Development Commands

All commands should be run from the `xiandan-kanban/xiandan-kanban-app/` directory:

```bash
# Install dependencies
pnpm install

# Development server with auto-install
pnpm dev

# Production build
pnpm build:prod

# Standard build (development mode)
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview

# Clean dependencies
pnpm clean
```

**Important**: All scripts automatically run `pnpm install --prefer-offline` before execution to ensure dependencies are up-to-date.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript 5.6
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS with shadcn/ui components (Radix UI)
- **State Management**:
  - Zustand for global state (auth, boards, tasks)
  - No React Query despite being in dependencies
- **Drag & Drop**: @dnd-kit/core for Kanban card interactions
- **Routing**: React Router v6
- **Forms**: react-hook-form with zod validation

### Backend (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password
- **Real-time**: Supabase Realtime subscriptions for live updates
- **Edge Functions**: Deno-based serverless functions in `supabase/functions/`
- **Migrations**: SQL migrations in `supabase/migrations/`

## Architecture

### Frontend Structure

```
src/
├── components/
│   ├── Auth/          # LoginPage, RegisterPage
│   ├── Board/         # BoardView, TaskCard, Column, CreateTaskModal, etc.
│   └── Dashboard/     # Dashboard, CreateBoardModal, StatsPanel
├── stores/            # Zustand stores
│   ├── authStore.ts   # User authentication state
│   ├── boardStore.ts  # Boards and columns CRUD + realtime
│   └── taskStore.ts   # Tasks CRUD + realtime
├── lib/
│   ├── supabase.ts    # Supabase client + TypeScript interfaces
│   └── utils.ts       # Utility functions (cn, etc.)
└── hooks/             # Custom React hooks (use-mobile.tsx)
```

### State Management Pattern

**Zustand Stores** handle all application state with a consistent pattern:

1. **authStore**: User session, profile, and authentication methods
   - `initialize()` - Check existing session on app load
   - `signIn()`, `signUp()`, `signOut()` - Auth operations
   - Listens to Supabase auth state changes

2. **boardStore**: Boards and columns with realtime subscriptions
   - CRUD operations for boards and columns
   - `subscribeToColumns(boardId)` - Real-time column updates
   - `unsubscribeFromColumns()` - Clean up subscriptions

3. **taskStore**: Tasks with realtime subscriptions
   - CRUD operations for tasks
   - `subscribeToTasks(boardId)` - Real-time task updates
   - `unsubscribeFromTasks()` - Clean up subscriptions

**Pattern**: Each store exposes loading/error states and async methods that update Supabase and local state.

### Routing & Authentication

- **Public Routes**: `/login`, `/register` - Redirect to `/dashboard` if authenticated
- **Protected Routes**: `/dashboard`, `/board/:boardId` - Require authentication
- **Route Guards**: `ProtectedRoute` and `PublicRoute` components check auth state
- **Auth Initialization**: `App.tsx` calls `authStore.initialize()` on mount to restore session

### Real-time Updates

The application uses Supabase Realtime for live collaboration:

- **Columns**: `boardStore.subscribeToColumns(boardId)` subscribes to column changes
- **Tasks**: `taskStore.subscribeToTasks(boardId)` subscribes to task changes
- **Pattern**: Subscribe on component mount, unsubscribe on unmount
- **Events**: INSERT, UPDATE, DELETE events update local Zustand state automatically

## Database Schema

Core tables (see `supabase/migrations/` for complete schema):

- **user_profiles**: User metadata (auto-created via trigger on auth.users)
- **boards**: Kanban boards (user_id FK)
- **columns**: Board columns (board_id FK, position for ordering)
- **tasks**: Task cards (board_id FK, column_id FK, position for ordering)
- **task_tags**: Tags for tasks (task_id FK)
- **task_comments**: Comments on tasks (task_id FK, user_id FK)
- **reminders**: Email reminders (task_id FK)

**RLS Policies**: All tables use Row Level Security - users can only access their own data. See migration `1764397678_enable_rls_policies.sql` for policy details.

## Supabase Configuration

### Environment Variables

Required in `.env` or `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Edge Functions

Located in `supabase/functions/`:

- **check-reminders**: Cron job to check for pending reminders
- **send-email-reminder**: Send email notifications for task reminders
- **create-admin-user**: Utility to create admin users

Edge functions run in Deno runtime and use Supabase Edge Function environment.

### Database Migrations

Migration files in `supabase/migrations/` are numbered with Unix timestamps:

1. `1764397628_create_core_tables.sql` - Initial schema
2. `1764397678_enable_rls_policies.sql` - Security policies
3. `1764397719_enable_realtime_and_functions.sql` - Enable realtime
4. `1764399216_create_user_profile_trigger.sql` - Auto-create profiles
5. `1764399316_create_task_comments_and_reminders.sql` - Comments/reminders
6. `1764401189_simplify_rls_policies.sql` - Policy optimization

## Development Guidelines

### Path Aliases

Use `@/` to import from `src/`:

```typescript
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
```

### TypeScript Types

Database types are defined in `src/lib/supabase.ts`:
- UserProfile
- Board
- Column
- Task
- TaskTag
- Reminder

### Component Patterns

1. **UI Components**: Use shadcn/ui components from `src/components/ui/` (imported via `@/`)
2. **Forms**: Use react-hook-form with zod schemas
3. **Modals**: Dialog components from Radix UI
4. **Loading States**: Check store's `loading` state before rendering
5. **Error Handling**: Display store's `error` state to users

### Working with Supabase

```typescript
// Import client and types
import { supabase } from '@/lib/supabase'
import type { Board } from '@/lib/supabase'

// Query pattern (in Zustand store)
const { data, error } = await supabase
  .from('boards')
  .select('*')
  .eq('user_id', userId)

// Always handle errors
if (error) throw error

// Update local state
set({ boards: data })
```

### Build Modes

- **Development**: `pnpm dev` or `pnpm build` - Includes source identifier plugin for debugging
- **Production**: `pnpm build:prod` - Sets `BUILD_MODE=prod`, disables source identifier plugin

The source identifier plugin adds `data-matrix-*` attributes to components for easier debugging in dev mode.

## Testing Strategy

No test files currently exist in the repository. When adding tests:

- Use Vitest (compatible with Vite)
- Follow React Testing Library patterns
- Test user flows, not implementation details

## Documentation

Technical documentation is in `docs/`:
- `tech_architecture.md` - Full technical architecture (Chinese)
- `feature_requirements.md` - Feature specifications (Chinese)
- `database_api_design.md` - Database and API design
- `ui_ux_design.md` - UI/UX guidelines
- `email_stats_system.md` - Email reminder system design

## Common Patterns

### Creating a New Feature

1. Define TypeScript types in `src/lib/supabase.ts`
2. Create Zustand store in `src/stores/` with CRUD methods
3. Add database migration in `supabase/migrations/`
4. Create React components in `src/components/`
5. Add routes in `src/App.tsx` if needed
6. Subscribe to realtime updates if collaborative

### Adding a New Store

```typescript
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface MyState {
  items: Item[]
  loading: boolean
  error: string | null

  fetchItems: () => Promise<void>
  createItem: (item: NewItem) => Promise<Item | null>
  // ... other methods
}

export const useMyStore = create<MyState>((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.from('items').select('*')
      if (error) throw error
      set({ items: data, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },
  // ... implement other methods
}))
```

## Troubleshooting

### Build Issues

- **Vite temp errors**: Run `pnpm clean` then `pnpm install`
- **TypeScript errors**: Check `tsconfig.json` references are correct
- **Path resolution**: Ensure Vite config and tsconfig `@/*` aliases match

### Supabase Issues

- **Auth not persisting**: Check `authStore.initialize()` is called in `App.tsx`
- **RLS blocking queries**: Verify user is authenticated and policies allow access
- **Realtime not updating**: Check subscription is active and not cleaned up prematurely

### State Management

- **Stale data**: Ensure store methods update local state after Supabase calls
- **Memory leaks**: Always unsubscribe from realtime channels on unmount
- **Race conditions**: Use store's loading state to prevent duplicate requests
