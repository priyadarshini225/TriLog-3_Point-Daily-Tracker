# TriLog - Quick Reference Card

## 🚀 Quick Start Commands

### First Time Setup
```bash
# Windows
install.bat

# Mac/Linux
chmod +x install.sh && ./install.sh

# Edit backend/.env with MongoDB URI
# Then seed the database:
cd backend && npm run seed
```

### Development
```bash
# Windows - Start both servers
start.bat

# Mac/Linux - Start both servers
chmod +x start.sh && ./start.sh

# OR manually:
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

## 📍 URLs
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔑 Default Test Account
After signup, you can create entries immediately. No defaults needed!

## 📂 Key Files

### Backend Entry Points
- `backend/server.js` - Main server
- `backend/seed.js` - Database seeding
- `backend/.env` - Configuration

### Frontend Entry Points
- `frontend/src/main.jsx` - React entry
- `frontend/src/App.jsx` - Root component
- `frontend/.env` - Configuration

## 🗄️ MongoDB Setup

### Local MongoDB
```bash
# Start MongoDB
mongod

# Connection string:
mongodb://localhost:27017/trilog
```

### MongoDB Atlas (Cloud)
```
1. Sign up at mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to backend/.env as MONGODB_URI
5. Whitelist IP: 0.0.0.0/0 (for development)
```

## 🎯 Core Workflows

### Create First Entry
1. Sign up → Auto login
2. Click "New Entry"
3. Fill 3 fields (completed, learned, revise)
4. Answer daily question (optional)
5. Save → Auto-schedules revisions

### View Revisions
- Dashboard shows pending revisions
- Revisions page shows all
- Items appear at +1, +3, +7 days after entry

### Calendar View
- Shows entry completion by month
- Click dates to see details
- Navigate months with arrows

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trilog
JWT_SECRET=change-me-to-random-string
JWT_REFRESH_SECRET=another-random-string
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 📊 API Quick Reference

### Auth
```bash
POST /api/auth/signup     # Create account
POST /api/auth/login      # Login
POST /api/auth/refresh    # Refresh token
GET  /api/auth/profile    # Get user info
```

### Entries
```bash
GET    /api/entries              # List all
GET    /api/entries?date=YYYY-MM-DD  # Get by date
POST   /api/entries              # Create
PUT    /api/entries/:id          # Update
DELETE /api/entries/:id          # Delete
```

### Questions
```bash
GET  /api/questions/today           # Today's question
POST /api/questions/:id/answer      # Submit answer
GET  /api/questions                 # History
```

### Revisions
```bash
GET  /api/revisions                    # List all
GET  /api/revisions?status=pending     # Filter by status
POST /api/revisions/:id/complete       # Mark done
```

## 🛠️ Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
# Windows: Check Services
# Mac: brew services list
# Linux: systemctl status mongod

# OR use MongoDB Atlas (cloud)
```

### Port Already in Use
```bash
# Change PORT in backend/.env
# Change port in frontend/vite.config.js
```

### CORS Errors
```bash
# Verify CLIENT_URL in backend/.env matches frontend URL
```

### JWT Token Invalid
```bash
# Clear browser localStorage
# F12 → Application → Local Storage → Clear
# Login again
```

### Dependencies Not Found
```bash
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
```

## 📦 NPM Scripts

### Backend
```bash
npm start       # Production server
npm run dev     # Development with nodemon
npm run seed    # Seed question templates
```

### Frontend
```bash
npm run dev     # Development server
npm run build   # Production build
npm run preview # Preview production build
```

## 🎨 Color Scheme
- **Primary**: #6366f1 (Indigo)
- **Secondary**: #8b5cf6 (Purple)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Amber)
- **Error**: #ef4444 (Red)

## 📱 Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔄 Development Workflow
1. Make changes to code
2. Hot reload applies automatically
3. Check browser console for errors
4. Check terminal for backend logs
5. Test in browser

## 📝 Database Collections
- `users` - User accounts
- `dailyentries` - Daily reflections
- `dailyquestions` - Assigned questions
- `dailyanswers` - User answers
- `revisionschedules` - Scheduled reviews
- `questiontemplates` - Question pool

## 🎯 Testing Checklist
- [ ] Sign up new user
- [ ] Login existing user
- [ ] Create daily entry
- [ ] Add revision items
- [ ] Answer daily question
- [ ] View calendar
- [ ] Check revisions (after 1+ days)
- [ ] Update settings
- [ ] Logout

## 🚀 Deployment Checklist
- [ ] Set production MongoDB URI
- [ ] Change JWT secrets to secure values
- [ ] Set NODE_ENV=production
- [ ] Build frontend (npm run build)
- [ ] Configure CORS for production domain
- [ ] Set up environment variables on host
- [ ] Test all API endpoints
- [ ] Enable MongoDB Atlas IP whitelist

## 📞 Support Resources
- **MongoDB Docs**: docs.mongodb.com
- **React Docs**: react.dev
- **Express Docs**: expressjs.com
- **Mongoose Docs**: mongoosejs.com

---

**Version**: 1.0.0  
**Last Updated**: December 12, 2025  
**License**: MIT
