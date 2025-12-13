# TriLog Frontend

Frontend application for TriLog - The 3-Point Daily Tracker

Built with React, Vite, React Query, and Zustand.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update `frontend/.env` with your backend API URL if different from default

3. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Features

- **Authentication**: Login and signup with JWT tokens
- **Dashboard**: Overview of today's entry, question, and pending revisions
- **Daily Entry**: Create 3-point reflections with:
  - What did I complete today?
  - What did I learn today?
  - What should I revise later?
- **Daily Question**: Answer one question per day from rotating categories
- **Calendar View**: Visual calendar showing entry completion
- **Revisions**: View and complete spaced repetition tasks (1, 3, 7 days)
- **Settings**: Manage timezone, notifications, and preferences

## Tech Stack

- **React 18**: UI library
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **React Query (TanStack Query)**: Server state management
- **Zustand**: Client state management
- **date-fns**: Date utilities
- **Axios**: HTTP client
- **React Hot Toast**: Notifications
- **Lucide React**: Icons

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   └── Layout.jsx   # Main layout with sidebar
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx
│   │   ├── NewEntry.jsx
│   │   ├── Calendar.jsx
│   │   ├── Revisions.jsx
│   │   └── Settings.jsx
│   ├── store/           # State management
│   │   └── authStore.js
│   ├── lib/             # Utilities
│   │   └── api.js       # API client
│   ├── App.jsx          # Root component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## Development

```bash
npm run dev    # Start dev server
npm run build  # Build for production
npm run preview # Preview production build
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:5000/api)

## Key Features Implementation

### Authentication Flow
- JWT tokens stored in localStorage
- Automatic token refresh on 401 errors
- Protected routes redirect to login

### State Management
- Auth state: Zustand with persistence
- Server state: React Query with caching
- Form state: React useState

### Offline Support
- React Query caching provides offline reads
- Future: Service worker for offline writes

## Notes

- All dates use YYYY-MM-DD format for consistency
- Character limits enforced client-side and server-side
- Responsive design mobile-first
- Toast notifications for user feedback
