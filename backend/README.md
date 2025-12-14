# TriLog Backend

Backend API for TriLog - The 3-Point Daily Tracker

Modern Node.js/Express API with MongoDB, JWT authentication, and email notifications.

## Features

✅ User authentication with JWT tokens and refresh rotation
✅ Daily entry management (Completed, Learned, Revise Later)
✅ Daily question system with category-based organization
✅ 1-3-7 spaced revision scheduling algorithm
✅ Email notifications via SMTP (Gmail compatible)
✅ Standardized error handling and validation
✅ Token generation and JWT utilities
✅ Calendar and revision analytics
✅ Request tracking with unique IDs

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, and SMTP config

# Seed database with question templates
npm run seed

# Start development server
npm run dev
```

Server runs on `http://localhost:5001` by default.

## Environment Variables

### Core Configuration
```
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/trilog
JWT_SECRET=your-super-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
CLIENT_URL=http://localhost:3000
```

### Email Notifications (Optional)

Enable SMTP email notifications for due revisions:

```
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=TriLog <no-reply@trilog.com>
```

**Gmail Configuration:**
1. Enable 2-factor authentication on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords) for your app
3. Use the generated 16-character password as `SMTP_PASS`

**Test Email Configuration:**
```bash
npm run test-email -- user@example.com
```

Or set `TEST_EMAIL_TO=user@example.com` in `.env` and run:
```bash
npm run test-email
```

### Scheduler Configuration
```
NOTIFICATION_SCHEDULER_ENABLED=true
NOTIFICATION_CHECK_INTERVAL=5m
```

## Project Structure

```
backend/
├── config/
│   └── database.js           # MongoDB connection
├── controllers/              # Route handler logic
│   ├── auth.controller.js    # Auth endpoints
│   ├── entry.controller.js   # Daily entries
│   ├── question.controller.js # Daily questions
│   ├── revision.controller.js # Revisions
│   └── user.controller.js    # User profile & settings
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── errorHandler.js      # Global error handler
├── models/                  # Mongoose schemas
│   ├── User.model.js
│   ├── DailyEntry.model.js
│   ├── DailyQuestion.model.js
│   ├── DailyAnswer.model.js
│   ├── QuestionTemplate.model.js
│   └── RevisionSchedule.model.js
├── routes/                  # API endpoints
│   ├── auth.routes.js
│   ├── entry.routes.js
│   ├── question.routes.js
│   ├── revision.routes.js
│   └── user.routes.js
├── services/                # Business logic & utilities
│   ├── notification.service.js  # Email notifications
│   ├── question.service.js      # Question logic
│   ├── revision.service.js      # Revision scheduling
│   ├── signal.service.js        # Analytics & keywords
│   └── resourceCatalog.js       # Resource recommendations
├── scheduler/
│   └── notificationScheduler.js # Cron for email notifications
├── scripts/
│   └── testEmail.js             # SMTP test utility
├── utils/                   # Shared utilities
│   ├── errorResponse.js         # Standardized error responses
│   ├── tokenUtils.js            # JWT generation helpers
│   └── validationHandler.js     # Validation error handling
├── server.js                # Express app entry point
├── seed.js                  # Database seeding script
├── package.json
└── README.md
```

## API Endpoints

### Authentication
```
POST   /api/auth/signup        # Register new user
POST   /api/auth/login         # Login with email & password
POST   /api/auth/refresh       # Refresh access token
GET    /api/auth/profile       # Get authenticated user profile
```

### Daily Entries
```
GET    /api/entries            # List user's entries (with date filters)
POST   /api/entries            # Create new entry
GET    /api/entries/:id        # Get single entry by ID
PUT    /api/entries/:id        # Update entry
DELETE /api/entries/:id        # Delete entry
```

### Questions
```
GET    /api/questions/today    # Get today's daily question
POST   /api/questions/:id/answer # Submit answer to question
GET    /api/questions          # Get question answer history
```

### Revisions
```
GET    /api/revisions          # Get scheduled revisions
GET    /api/revisions/:status  # Filter by status (pending/completed/missed)
POST   /api/revisions/:id/complete # Mark revision as complete
```

### User Settings
```
GET    /api/user/settings      # Get user preferences
PUT    /api/user/settings      # Update settings & notification preferences
```

## Key Features Explained

### 1-3-7 Spaced Revision
When a user marks something to "Revise Later," the system automatically schedules reminders:
- Day 1: First review
- Day 3: Second review (2 days after first)
- Day 7: Final review (4 days after second)

### Daily Question
One carefully crafted question per day to promote metacognition and reflection.

### Email Notifications
- Users must opt-in via Settings → `Email Notifications`
- Scheduler runs every 5 minutes
- Sends email when revisions are due
- Respects Do Not Disturb (DND) settings if enabled

### Error Handling
All API responses follow a consistent format:
```json
{
  "errorCode": "ERROR_TYPE",
  "message": "Human-readable message",
  "details": {...},
  "requestId": "unique-request-id"
}
```

## Development

### Run in watch mode
```bash
npm run dev
```

### Seed database
```bash
npm run seed
```

### Test email configuration
```bash
npm run test-email
```

### Run with specific environment
```bash
NODE_ENV=production npm start
```

## Notes

- All timestamps are stored in UTC
- Date format throughout: `YYYY-MM-DD`
- JWT tokens expire after 7 days by default
- Refresh tokens expire after 30 days
- Authentication is required for all endpoints except `/signup` and `/login`
- Each request gets a unique `requestId` for tracing

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **nodemailer** - Email sending
- **express-validator** - Request validation
- **node-cron** - Scheduled tasks

## License

MIT
