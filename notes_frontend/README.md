# Notes Frontend (Qwik)

Minimalistic, responsive notes application built with Qwik/QwikCity. Features:
- User authentication (frontend-only demo)
- Create, edit, delete notes (stored in localStorage)
- Search and tag filtering
- Grid and list views
- Responsive layout with top navigation, sidebar, and modals
- Light theme with customizable palette via CSS variables

## Quick Start

Install and run:
```bash
npm install
npm start
```

Open the browser window when it launches. The app is SSR in dev mode using Vite.

## Environment Variables

Create a `.env` or copy `.env.example`:
```
PUBLIC_APP_NAME=NoteEase
```

`PUBLIC_` variables are available to client-side code.

## Persistence

This demo persists notes and auth locally using `localStorage`. Keys:
- `notes_frontend__notes`
- `notes_frontend__user`
- `notes_frontend__viewmode`

## Development

- `npm start` - dev server
- `npm run preview` - production preview
- `npm run build` - build client and server bundles

## Project Structure

- `src/routes/index.tsx` - primary UI and application logic
- `src/routes/layout.tsx` - root layout
- `src/global.css` - global base styles
