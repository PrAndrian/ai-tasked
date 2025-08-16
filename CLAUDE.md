# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Tasked is a modern task management application built as a Turborepo monorepo using React 19, TanStack Start, Convex backend, and TypeScript. The project follows a workspace-based architecture with separate apps and packages.

## Architecture

### Monorepo Structure
- **Root**: Turborepo configuration with Bun package manager
- **apps/web**: React 19 frontend with TanStack Start (SSR framework)
- **packages/backend**: Convex backend functions and schema

### Key Technologies
- **Frontend**: React 19, TanStack Start (SSR), TanStack Router v1.121, TanStack Query v5.80
- **Backend**: Convex (reactive backend-as-a-service)
- **Styling**: Tailwind CSS v4.1, Radix UI components, shadcn/ui
- **State**: TanStack Query with Convex integration via @convex-dev/react-query
- **Forms**: TanStack React Form v1.0
- **Build**: Vite v7.0, Turbo v2.5.4
- **Package Manager**: Bun 1.2.19

## Development Commands

### Setup and Installation
```bash
bun install                    # Install all dependencies
bun dev:setup                  # Configure Convex project (first time setup)
```

### Development
```bash
bun dev                        # Start all apps (web on port 3001 + backend)
bun dev:web                    # Start only web app on port 3001
bun dev:server                 # Start only Convex backend
```

### Build and Type Checking
```bash
bun build                      # Build all apps
bun check-types                # TypeScript check across monorepo
```

## Architecture Details

### Frontend (apps/web)
- **Router Setup**: TanStack Start with generated route tree (`routeTree.gen.ts`)
- **State Management**: TanStack Query integrated with Convex via ConvexQueryClient
- **UI Components**: Located in `src/components/ui/` using Radix primitives
- **Theming**: Next Themes with dark mode support (default: dark theme)
- **Path Aliases**: `@/*` maps to `./src/*`

### Backend (packages/backend)
- **Schema**: Defined in `convex/schema.ts` using Convex v-system
- **Functions**: Mutations and queries in `convex/` directory
- **Generated Files**: Convex auto-generates API types in `_generated/`

### Convex Integration
- Frontend connects via `VITE_CONVEX_URL` environment variable
- Uses `@convex-dev/react-query` for TanStack Query integration
- Real-time subscriptions through Convex ConvexProvider wrapper

### Current Implementation (Phase 1 Complete)
The app now includes full Phase 1 features:

**Core Features Implemented:**
- **AI-Powered Task Creation**: Voice and text input with OpenAI GPT-4 integration
- **Full Task Management**: Complete CRUD with hierarchical tasks, scheduling, and priorities
- **Gamification System**: XP, levels, streaks, achievements, and character progression
- **User Authentication**: Simple email-based auth with user progress tracking
- **Google Calendar Integration**: OAuth 2.0 setup, event syncing, and scheduling

**Database Schema:**
- `users`: Authentication with Google Calendar tokens
- `tasks`: Full task structure with XP, difficulty, scheduling, recurrence
- `userProgress`: Gamification data (XP, levels, streaks, character state)
- `achievements`: Achievement system with requirements and rewards

**Frontend Components:**
- `TaskInput`: Voice/text input with Web Speech API (English/French)
- `TaskList`: Task management with filtering and status updates
- `ProgressDisplay`: XP progress, character growth, and stats
- `SimpleAuth`: Email-based authentication
- `VoiceInput`: Continuous voice recognition component

**Backend Functions:**
- `ai.ts`: OpenAI integration for natural language task processing
- `tasks.ts`: Complete task CRUD with XP calculation
- `gamification.ts`: XP system, achievements, and progress tracking
- `calendar.ts`: Google Calendar OAuth and event management
- `auth.ts`: User authentication and profile management

## Environment Setup

### Required Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Convex (get from convex.dev dashboard)
VITE_CONVEX_URL=your_convex_deployment_url

# OpenAI API (get from platform.openai.com)
OPENAI_API_KEY=your_openai_api_key

# Google Calendar (get from console.cloud.google.com)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

### First-Time Setup
1. `bun install` - Install dependencies
2. `bun dev:setup` - Configure Convex project
3. Configure environment variables
4. `bun dev` - Start development server

## Development Guidelines

### AI Integration
- OpenAI GPT-4 used for natural language task processing
- AI responses parsed into structured task objects
- Fallback handling for API failures
- Context includes user timezone and previous tasks

### AI Authority System
- **AI Controls**: Priority and difficulty levels (prevents XP farming)
- **AI Suggestions**: Optimal scheduling with XP boost rewards
- **User Controls**: Task scheduling dates, title, description, duration
- **XP Rewards**: Based on AI-determined priority and difficulty only
- **Date Suggestions**: AI suggests optimal timing with 10-50 XP bonuses

### Voice Input
- Web Speech API with continuous recognition
- English and French language support
- Offline capable (no internet required for speech recognition)
- Auto-submission for complete sentences

### Gamification System
- XP calculated based on priority, difficulty, and subtasks
- Level progression: `floor(sqrt(XP / 100)) + 1`
- Character stages unlock at specific XP thresholds
- Streak tracking with daily task completion

### Working with Convex
- Backend functions are in `packages/backend/convex/`
- Use `v.` validators for function arguments
- Convex generates TypeScript definitions automatically
- Always run `bun dev:setup` for first-time Convex configuration

### Frontend Development
- Follow TanStack Router conventions for routing
- Use TanStack Query for state management
- UI components should use Radix UI primitives with Tailwind styling
- Dark theme is default (`className="dark"` on html element)

### Google Calendar Integration
- OAuth 2.0 flow with offline access
- Automatic token refresh
- Bi-directional sync with calendar events
- Free time slot detection for task scheduling

### TypeScript Configuration
- Strict mode enabled with additional linting rules
- No unused locals/parameters allowed
- Bundler module resolution with verbatim module syntax
- Import extensions allowed for bundler compatibility

### Code Quality
- Husky git hooks configured (though lint-staged appears incomplete)
- TypeScript checks across entire monorepo
- Vite for fast development and building

## Testing and Quality Assurance

### Type Checking
```bash
bun check-types                # Run TypeScript checks across all workspaces
```

Note: The project has strict TypeScript configuration with:
- No unused locals/parameters allowed (`noUnusedLocals`, `noUnusedParameters`)
- Strict mode enabled with additional safety checks
- No fallthrough cases in switch statements
- Bundler module resolution with import extensions allowed

### Missing Development Commands

The project currently lacks explicit commands for:
- **Linting**: No `lint` command defined in any package.json
- **Testing**: No test framework or test commands configured
- **Type checking per workspace**: Only global `check-types` available

When adding new features, ensure you:
1. Run `bun check-types` to verify TypeScript compliance
2. Test the build process with `bun build`
3. Verify development server starts correctly with `bun dev`