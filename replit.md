# Tavern Tales - AI RPG Chat

## Overview

Tavern Tales is a multiplayer AI-powered tabletop RPG (D&D-style) web application. Players can create or join game sessions, build characters with full D&D 5e-style stat sheets, and engage in collaborative storytelling with an AI Game Master. The app features a cozy fantasy tavern aesthetic with real-time turn-based gameplay.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration
- **Fonts**: Fantasy-themed Google Fonts (MedievalSharp, Crimson Text, Cinzel)

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Style**: RESTful JSON API under `/api/*` routes
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: Player sessions via unique tokens stored in localStorage

### Key Design Patterns
- **Monorepo Structure**: Client (`client/`), server (`server/`), and shared code (`shared/`) in one repository
- **Shared Schema**: Database schemas defined in `shared/schema.ts` using Drizzle, with Zod validation via drizzle-zod
- **Polling for Real-time**: Game state updates via periodic polling (3-second intervals) rather than WebSockets
- **Local Storage Caching**: Chat history and session data cached locally for offline viewing and faster initial loads

### Game Flow Architecture
1. **Lobby** (`/`): Create new game or join via share code
2. **Character Creation** (`/character-creation`): D&D-style point-buy stat allocation
3. **Game** (`/game`): Main gameplay with character panels, chat area, and turn management

### Data Models
- **Games**: Session containers with share codes, turn phases, and system prompts
- **Players**: Game participants with session tokens and action tracking
- **Characters**: Full D&D character sheets (stats, skills, saving throws, inventory, spells)
- **Messages**: Chat/narrative history with role-based formatting (player, assistant, system)

### AI Integration
- **Provider**: OpenRouter API with Mistral 7B Instruct (free tier)
- **Usage**: AI generates Game Master responses based on conversation history
- **Fallback**: Mock responses when API unavailable

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations and schema push (`db:push` script)

### Third-Party APIs
- **OpenRouter**: AI chat completions API for Game Master responses
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Requires API key (optional, has mock fallback)

### Key NPM Packages
- **UI**: Radix UI primitives, Lucide icons, Framer Motion animations
- **Forms**: React Hook Form with Zod resolvers
- **Data**: TanStack Query, date-fns
- **Build**: esbuild for server bundling, Vite for client