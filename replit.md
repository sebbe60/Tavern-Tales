# Tavern Tales - AI RPG Chat

## Overview

Tavern Tales is a multiplayer AI-powered tabletop RPG (D&D-style) web application. Players can create or join game sessions, build characters with flexible stat sheets, and engage in collaborative storytelling with an AI Game Master. The app features a cozy fantasy tavern aesthetic with real-time turn-based gameplay.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Dynamic Character System**: 
  - Stats start at 1 with no point limits - fully customizable
  - Added extra stats: Luck, Perception, Agility, Endurance
  - XP bar shows progress to next level
  - Skills/abilities section with turn-based cooldowns
  - Status effects display (poisoned, burning, etc.)
  - All managed dynamically by the AI Game Master

- **AI-Controlled Progression**:
  - AI awards XP based on story events
  - AI adds/removes inventory items
  - AI grants new abilities with cooldowns
  - AI applies/removes status effects
  - AI adjusts HP/MP based on combat and events

- **Opening Story**: When both players create characters, AI generates an immersive tavern scene.

- **Improved AI Behavior**: Strict prompts prevent AI from acting for players, asks for dice rolls.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Fonts**: Fantasy-themed (MedievalSharp, Crimson Text, Cinzel)

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Style**: RESTful JSON API under `/api/*`
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: Player sessions via localStorage tokens

### Character System
- **Stats**: STR, DEX, CON, INT, WIS, CHA + optional Luck, Perception, Agility, Endurance
- **Resources**: HP, MP with visual progress bars
- **XP System**: AI-controlled leveling with XP bar
- **Abilities**: AI-created skills with turn-based cooldowns (weak=1-2, strong=5-10 turns)
- **Status Effects**: AI-managed conditions (poisoned, burning, frightened, etc.)
- **Inventory**: Starts empty, AI adds items during adventure

### AI Character Update System
The AI can embed character updates in its responses using a special format:
- Grant/remove XP and trigger level ups
- Add/remove inventory items
- Apply/remove status effects with durations
- Create new abilities with cooldowns
- Put abilities on cooldown when used
- Adjust HP/MP for damage/healing

### Data Models
- **Games**: Session containers with share codes, turn phases
- **Players**: Game participants with session tokens
- **Characters**: Stats, HP/MP, XP, abilities, status effects, inventory
- **Messages**: Chat history with dice roll info

### AI Integration
- **Provider**: OpenRouter API with Mistral 7B Instruct (free tier)
- **Character Context**: AI knows all character stats, abilities, inventory
- **Update Parsing**: Backend parses AI responses for character changes
- **Cooldown Management**: Abilities and status effects tracked per turn

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL`
- **Drizzle Kit**: Schema management via `db:push`

### Third-Party APIs
- **OpenRouter**: AI chat completions
  - Model: `mistralai/mistral-7b-instruct:free`
  - Requires `OPENROUTER_API_KEY` secret

## API Endpoints

- `POST /api/games` - Create new game
- `GET /api/games/:shareCode` - Get game by code
- `POST /api/games/:gameId/join` - Join as player
- `GET /api/games/:gameId/state` - Get full game state
- `POST /api/games/:gameId/messages` - Send action (triggers AI)
- `POST /api/games/:gameId/start` - Start adventure manually
- `POST /api/characters` - Create character
- `PATCH /api/characters/:id` - Update character
- `POST /api/dice/roll` - Roll dice
