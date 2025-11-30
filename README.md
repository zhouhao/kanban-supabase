# 咸蛋快板 (Xiandan Kanban)

[![Unit Tests](https://github.com/zhouhao/kanban-supabase/actions/workflows/test.yml/badge.svg)](https://github.com/zhouhao/kanban-supabase/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/zhouhao/kanban-supabase/branch/master/graph/badge.svg)](https://codecov.io/gh/zhouhao/kanban-supabase)

A modern, lightweight web-based Kanban board management application built with React and Supabase.

## Features

### Core Features
- **User Authentication** - Secure email/password authentication with Supabase Auth
- **Multi-Board Management** - Create and manage multiple Kanban boards
- **Flexible Task Management** - Create, edit, and organize tasks across customizable columns
- **Drag & Drop** - Intuitive drag-and-drop interface for task organization
- **Real-time Collaboration** - Live updates across all connected clients
- **Task Details** - Rich task information including:
  - Priority levels (Low, Medium, High, Urgent)
  - Due dates and start dates
  - Task descriptions
  - Tags and labels
  - Comments
- **Email Reminders** - Automated email notifications for task deadlines
- **Statistics Dashboard** - Visual insights into task completion and productivity

### User Experience
- Modern, responsive UI built with Tailwind CSS
- Clean, intuitive interface with minimal learning curve
- Mobile-friendly design
- Dark mode support (via next-themes)

## Tech Stack

### Frontend
- **React 18** - UI framework with latest concurrent features
- **TypeScript 5.6** - Type-safe development
- **Vite 6** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components (Radix UI primitives)
- **@dnd-kit** - Modern drag-and-drop toolkit
- **Zustand** - Lightweight state management
- **React Router v6** - Client-side routing
- **React Hook Form + Zod** - Form handling and validation

### Backend (Supabase)
- **PostgreSQL** - Robust relational database
- **Supabase Auth** - Authentication and user management
- **Row Level Security (RLS)** - Database-level security policies
- **Realtime Subscriptions** - Live data synchronization
- **Edge Functions** - Serverless functions for email reminders and cron jobs

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (package manager)
- **Supabase Account** - For backend services

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/zhouhao/kanban-supabase.git
cd kanban-supabase/xiandan-kanban-app
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

To get these credentials:
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy the Project URL and anon/public key

### 4. Database Setup

Run the migrations in your Supabase project:

1. Go to the SQL Editor in your Supabase dashboard
2. Execute the migration files in order from `supabase/migrations/`:
   - `1764397628_create_core_tables.sql`
   - `1764397678_enable_rls_policies.sql`
   - `1764397719_enable_realtime_and_functions.sql`
   - `1764399216_create_user_profile_trigger.sql`
   - `1764399316_create_task_comments_and_reminders.sql`
   - `1764401189_simplify_rls_policies.sql`

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (with auto-install)
pnpm dev

# Build for production
pnpm build:prod

# Build for development
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview

# Clean dependencies and cache
pnpm clean
```

**Note**: All scripts automatically run `pnpm install --prefer-offline` before execution to ensure dependencies are up-to-date.

## Project Structure

```
src/
├── components/
│   ├── Auth/           # Authentication pages (Login, Register)
│   ├── Board/          # Board view and task components
│   ├── Dashboard/      # Dashboard and statistics
│   └── ui/             # Reusable UI components (shadcn/ui)
├── stores/             # Zustand state management
│   ├── authStore.ts    # Authentication state
│   ├── boardStore.ts   # Boards and columns state
│   └── taskStore.ts    # Tasks state
├── lib/
│   ├── supabase.ts     # Supabase client and type definitions
│   └── utils.ts        # Utility functions
├── hooks/              # Custom React hooks
├── App.tsx             # Main app component with routing
└── main.tsx            # Application entry point

supabase/
├── functions/          # Edge Functions (email reminders, cron jobs)
└── migrations/         # Database schema migrations
```

## State Management

The application uses **Zustand** for state management with three main stores:

- **authStore** - User authentication and profile management
- **boardStore** - Board and column CRUD operations with realtime subscriptions
- **taskStore** - Task CRUD operations with realtime subscriptions

Each store follows a consistent pattern:
- Async methods for Supabase operations
- Loading and error states
- Real-time subscription management
- Automatic local state updates

## Real-time Features

The application uses Supabase Realtime for live collaboration:

- **Column Updates** - Changes to columns are instantly reflected across all clients
- **Task Updates** - Task creation, updates, and deletion sync in real-time
- **Automatic Subscription** - Components subscribe on mount and unsubscribe on unmount

## Database Schema

Core tables:
- `user_profiles` - User metadata and preferences
- `boards` - Kanban boards
- `columns` - Board columns with positioning
- `tasks` - Task cards with full details
- `task_tags` - Tags for categorizing tasks
- `task_comments` - Comments on tasks
- `reminders` - Email reminder scheduling

All tables use Row Level Security (RLS) to ensure users can only access their own data.

## Building for Production

### Development Build
```bash
pnpm build
```
Includes source identifiers for debugging (`data-matrix-*` attributes)

### Production Build
```bash
pnpm build:prod
```
Optimized build without debug attributes

## Deployment

### Frontend Deployment (Recommended: Vercel)

1. Connect your repository to [Vercel](https://vercel.com)
2. Set the root directory to `xiandan-kanban/xiandan-kanban-app`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Alternative: Netlify, Cloudflare Pages
All static hosting platforms that support Vite are compatible.

### Backend (Supabase)
The backend is already hosted on Supabase Cloud. For edge functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development Guidelines

### Path Aliases
Use `@/` to import from `src/`:

```typescript
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
```

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Consistent naming conventions (see CLAUDE.md)

### Adding New Features
1. Define TypeScript types in `src/lib/supabase.ts`
2. Create/update Zustand store in `src/stores/`
3. Add database migration if needed
4. Create React components
5. Update routing if necessary

## Troubleshooting

### Build Issues
```bash
# Clear cache and reinstall
pnpm clean
pnpm install
```

### Authentication Not Persisting
- Verify environment variables are set correctly
- Check browser console for errors
- Ensure `authStore.initialize()` is called in `App.tsx`

### Real-time Updates Not Working
- Check Supabase Realtime is enabled for your tables
- Verify RLS policies allow SELECT operations
- Ensure subscription cleanup on component unmount

## Documentation

Additional documentation is available in the `docs/` directory:
- Technical Architecture (Chinese)
- Feature Requirements (Chinese)
- Database & API Design
- UI/UX Guidelines
- Email System Design

## License

[License information to be added]

## Support

For issues and questions, please check:
- Existing GitHub issues
- Supabase documentation: https://supabase.com/docs
- React documentation: https://react.dev

---

Built with ❤️ using React and Supabase
