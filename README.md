# TriLog — 3-Point Daily Tracker

A minimalist habit-focused productivity application that combines daily three-item reflection with spaced repetition.

## Project Overview

TriLog helps users build a daily reflection habit with:
- **3-Point Daily Entry**: Complete, Learn, Revise Later
- **Daily Question Coach**: One micro-question per day
- **1-3-7 Spaced Revision**: Automatic reminder scheduling

## Architecture

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **State Management**: React Query + Zustand
- **Authentication**: JWT tokens

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone or navigate to the project**
```bash
cd TriLog
```

2. **Setup Backend**
```bash
cd backend
npm install
# Edit .env with your MongoDB URI and secrets
npm run seed  # Seed question templates
npm run dev   # Start backend on port 5001
```

3. **Setup Frontend** (in new terminal)
```bash
cd frontend
npm install
# Edit .env if needed
npm run dev   # Start frontend on port 3000
```

4. **Access the app**
- Open http://localhost:3000
- Create an account and start tracking!

## Features

### Current (v1.0)
✅ User authentication (signup/login)
✅ Daily 3-point entry form
✅ Daily question system with categories
✅ 1-3-7 day revision scheduling
✅ Calendar view with entry tracking
✅ Revision dashboard
✅ User settings and preferences

### Coming Soon
🔜 Push notifications for revisions
🔜 Growth profile analysis
🔜 Streak tracking and gamification
🔜 Data export (PDF/JSON)
🔜 Offline-first sync
🔜 Mobile apps (React Native)

## Project Structure

```
TriLog/
├── backend/              # Node.js API
│   ├── config/          # Database config
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.js        # Entry point
├── frontend/            # React SPA
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page views
│   │   ├── store/       # State management
│   │   ├── lib/         # API client
│   │   └── App.jsx
│   └── index.html
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Entries
- `GET /api/entries` - List entries
- `POST /api/entries` - Create entry
- `GET /api/entries/:id` - Get entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Questions
- `GET /api/questions/today` - Today's question
- `POST /api/questions/:id/answer` - Submit answer

### Revisions
- `GET /api/revisions` - List revisions
- `POST /api/revisions/:id/complete` - Complete revision

### Settings
- `GET /api/user/settings` - Get settings
- `PUT /api/user/settings` - Update settings

## Environment Variables

### Backend (.env)
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/trilog
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5001/api
```

## Development Workflow

1. Make sure MongoDB is running
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm run dev`
4. Open http://localhost:3000
5. Create account and test features

## Tech Stack Details

### Frontend
- React 18
- Vite (build tool)
- React Router (routing)
- React Query (server state)
- Zustand (client state)
- Axios (HTTP)
- date-fns (dates)
- Lucide React (icons)

### Backend
- Express (API framework)
- Mongoose (MongoDB ODM)
- JWT (authentication)
- bcryptjs (password hashing)
- express-validator (validation)

## Database Schema

### Users
- Email, password, name, timezone
- Preferences (notifications, DND, categories)

### DailyEntries
- User ID, date, completed, learned, reviseLater[]
- Question/answer links

### DailyQuestions
- User ID, question text, category, scheduled date

### DailyAnswers
- User ID, question ID, answer text, metadata

### RevisionSchedules
- User ID, entry ID, revision type (1/3/7)
- Scheduled date, status, completion info

### QuestionTemplates
- Question text, category, difficulty, tags

## Contributing

This is a learning/portfolio project. Feel free to fork and customize!

## License

MIT

## Roadmap

See the full process flow document for detailed architecture and future enhancements including:
- Growth profile analysis
- Advanced spaced repetition algorithms
- Mobile applications
- Team/coach features
- Export and analytics

---

**Version**: 1.0.0
**Last Updated**: December 12, 2025
