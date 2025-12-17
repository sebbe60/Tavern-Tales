# Tavern Tales - AI RPG Chat

## Overview

Tavern Tales is a multiplayer AI-powered tabletop RPG (D&D-style) web application. Players can create or join game sessions, build characters with full D&D 5e-style stat sheets, and engage in collaborative storytelling with an AI Game Master. The app features a cozy fantasy tavern aesthetic with real-time turn-based gameplay.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Fixed AI Game Master behavior**: The AI now has a strict system prompt that prevents it from acting for players, asks for dice rolls when appropriate, and waits for player input before continuing the story.
- **Added opening story**: When both players create their characters, the AI automatically generates an immersive opening scene to start the adventure.
- **Character context in AI**: The AI now knows each player's stats, class, race, and inventory so it can reference them in the narrative.
- **Improved message formatting**: Fixed issues with [/INST] tags leaking into responses. Messages are now properly consolidated for the AI.
- **Dice integration**: Dice rolls are now displayed in the chat with full context (roll type, individual dice, total).

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

### AI Game Master System

The AI receives a strict system prompt that includes:
- All player character stats and abilities
- Rules about never acting for players
- Instructions to ask for dice rolls when outcomes are uncertain
- Formatting guidelines for rich narrative
- Instructions to stop and wait for player input

The system consolidates multiple player messages into one AI request to prevent the AI from responding to each player separately.

### AI Integration
- **Provider**: OpenRouter API with Mistral 7B Instruct (free tier)
- **Features**: 
  - Stop sequences to prevent runaway generation
  - Character context injection for stat-aware narration
  - Automatic opening story when both players are ready
- **Fallback**: High-quality mock responses when API unavailable

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations and schema push (`db:push` script)

### Third-Party APIs
- **OpenRouter**: AI chat completions API for Game Master responses
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Model: `mistralai/mistral-7b-instruct:free`
  - Requires `OPENROUTER_API_KEY` secret

### Key NPM Packages
- **UI**: Radix UI primitives, Lucide icons, Framer Motion animations
- **Forms**: React Hook Form with Zod resolvers
- **Data**: TanStack Query, date-fns
- **Build**: esbuild for server bundling, Vite for client

## API Endpoints

- `POST /api/games` - Create a new game session
- `GET /api/games/:shareCode` - Get game by share code
- `POST /api/games/:gameId/join` - Join a game as a new player
- `GET /api/games/:gameId/state` - Get full game state (messages, characters, players)
- `POST /api/games/:gameId/messages` - Send a player message/action
- `POST /api/games/:gameId/start` - Manually trigger opening story
- `POST /api/characters` - Create a character for a player
- `PATCH /api/characters/:id` - Update character stats/inventory
- `POST /api/dice/roll` - Roll dice (e.g., "1d20+5")
