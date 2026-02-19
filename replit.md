# AI Master Bot

## Overview

This is a Telegram bot landing page and backend application. The project serves two purposes:

1. **Telegram Bot** — An AI-powered chatbot that runs on Telegram, using OpenAI for chat completions. It supports VIP user management, conversation history, and admin commands.
2. **Landing Page** — A modern, dark-themed marketing page built with React that directs users to the Telegram bot.

The web frontend is primarily a landing page with minimal API interaction (just a health check). The core logic lives in the Telegram bot running on the server.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode by default
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Animations**: Framer Motion for landing page animations
- **State Management**: TanStack React Query for server state
- **Build Tool**: Vite with HMR support
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend is a single-page app with just a Home landing page and a 404 page. The visual style is "modern, dark mode, tech-oriented" with neon purple/cyan accents using Space Grotesk and Inter fonts.

### Backend
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript, executed with tsx
- **Telegram Bot**: Telegraf library for Telegram Bot API
- **AI Integration**: OpenAI SDK for chat completions (supports Replit AI Integrations base URL)
- **Build**: esbuild for server bundling, Vite for client bundling
- **Entry Point**: `server/index.ts` creates HTTP server, registers routes, sets up Vite dev middleware or serves static files

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (main app schema) and `shared/models/chat.ts` (Replit integrations chat schema)
- **Schema Push**: `npm run db:push` uses drizzle-kit to push schema to database
- **Connection**: pg Pool via `DATABASE_URL` environment variable
- **Session Store**: connect-pg-simple for PostgreSQL-backed sessions

### Database Schema
Two main tables in `shared/schema.ts`:
- **users** — `id`, `telegramId` (unique), `username`, `isVip`, `createdAt`
- **messages** — `id`, `userId` (FK to users), `role`, `content`, `type`, `meta` (JSONB), `createdAt`

Additional tables in `shared/models/chat.ts` (Replit integrations):
- **conversations** — `id`, `title`, `createdAt`
- **messages** — `id`, `conversationId` (FK), `role`, `content`, `createdAt`

### API Structure
Minimal REST API since most interaction happens through Telegram:
- `GET /api/health` — Health check endpoint
- `GET /api/status` — Status check (defined in shared routes)
- Replit integration routes for conversations, chat, image generation, and audio (under `server/replit_integrations/`)

### Key Design Patterns
- **Shared Schema**: Database schemas and types are defined in `shared/` and imported by both client and server
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations behind `DatabaseStorage` class
- **Middleware Pattern**: Bot uses Telegraf middleware to auto-create/update users on every interaction
- **Dev/Prod Split**: Vite dev server middleware in development, static file serving in production

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required)
- `TELEGRAM_BOT_TOKEN` — Telegram Bot API token (required)
- `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Custom OpenAI base URL (Replit AI)
- `ADMIN_ID` — Telegram user ID for admin access
- `VIP_PASSWORD` — Password for VIP access

### Scripts
- `npm run dev` — Development server with Vite HMR
- `npm run build` — Production build (Vite for client, esbuild for server)
- `npm start` — Run production build
- `npm run db:push` — Push Drizzle schema to PostgreSQL

## External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **Telegram Bot API** — Via Telegraf library, requires `TELEGRAM_BOT_TOKEN`
- **OpenAI API** — For AI chat completions in the bot, supports Replit AI Integrations proxy via custom base URL
- **Google Fonts** — Space Grotesk, Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter loaded via CDN
- **Replit Integrations** — Audio (voice chat, TTS, STT), image generation (gpt-image-1), chat, and batch processing utilities in `server/replit_integrations/` and `client/replit_integrations/`