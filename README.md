# Photography Portfolio

A high-performance, accessible, and gallery-grade photography portfolio built with [Astro](https://astro.build).

## Features
- **Astro SSG:** Fast, static HTML delivery.
- **Dark Editorial Theme:** Custom design tokens built on Tailwind CSS.
- **Accessible Lightbox:** React-powered island with focus traps and keyboard support.
- **Content Collections:** Type-safe markdown-based project management.
- **Performance First:** Strict JS budgets, responsive images, no heavy client-side routers.

## Setup

1. Make sure Node.js (v20+) is installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template and fill in your details:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Commands

- `npm run dev`: Starts the local dev server.
- `npm run build`: Builds the static site to the `dist/` directory.
- `npm run preview`: Previews the built site locally.
- `npm run check`: Runs Astro type checking.

## Architecture & Documentation
For a complete overview of the architecture, design tokens, and deployment runbook, refer to the documentation in the `docs/` folder (to be added in future phases).
