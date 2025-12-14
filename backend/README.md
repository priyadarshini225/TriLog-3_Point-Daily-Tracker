# TriLog Backend

Backend API for TriLog - The 3-Point Daily Tracker

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update `backend/.env` with your configuration:
   - MongoDB URI
   - JWT secrets
   - Other settings

3. Seed the database with question templates:
```bash
npm run seed
```

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 5000; this repo’s sample `backend/.env` uses `5001`)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for access tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens
- `CLIENT_URL` - Frontend URL for CORS

### Email Notifications (SMTP)

To enable email notifications for due revisions:

1. Install deps after pulling changes:
```bash
npm install
```

2. Set these in `backend/.env`:

- `EMAIL_ENABLED=true`
- `SMTP_HOST` (e.g. `smtp.gmail.com`)
- `SMTP_PORT` (e.g. `587`)
- `SMTP_SECURE` (`false` for STARTTLS on 587, `true` for 465)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (e.g. `TriLog <no-reply@yourdomain.com>`)

Notes:
- Gmail requires an **App Password**.
- Users must opt-in via Settings: `Email Notifications`.
- The scheduler runs every 5 minutes and sends emails for revisions that are due.

Quick SMTP test (recommended before relying on the scheduler):
```bash
npm run test-email -- you@example.com
```
Or set `TEST_EMAIL_TO` in `backend/.env` and run:
```bash
npm run test-email
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Daily Entries
- `GET /api/entries` - Get entries (with date filters)
- `POST /api/entries` - Create new entry
- `GET /api/entries/:id` - Get single entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Questions
- `GET /api/questions/today` - Get today's question
- `POST /api/questions/:id/answer` - Submit answer
- `GET /api/questions` - Get questions history

### Revisions
- `GET /api/revisions` - Get scheduled revisions
- `POST /api/revisions/:id/complete` - Mark revision complete

### User Settings
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update settings

## Project Structure

```
backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic
├── server.js        # Entry point
└── seed.js          # Database seeding
```

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

## Notes

- All API responses include a `requestId` for tracing
- Authentication required for most endpoints (use Bearer token)
- Date format: YYYY-MM-DD
- Revision scheduling happens automatically on entry creation
