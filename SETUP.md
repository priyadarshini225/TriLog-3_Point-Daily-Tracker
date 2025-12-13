# TriLog Setup Guide

Follow these steps to get TriLog up and running on your local machine.

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- ✅ **MongoDB** - Either:
  - Local installation - [Download here](https://www.mongodb.com/try/download/community)
  - OR MongoDB Atlas (free cloud) - [Sign up here](https://www.mongodb.com/cloud/atlas/register)
- ✅ **Git** (optional, for version control)
- ✅ A code editor like VS Code

## Step-by-Step Setup

### 1. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend (in a new terminal)
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

#### Backend Configuration
1. Navigate to `backend` folder
2. Edit `backend/.env` and update these values:

   **If using local MongoDB:**
   ```
   MONGODB_URI=mongodb://localhost:27017/trilog
   ```

   **If using MongoDB Atlas:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trilog
   ```

   **Important: Change the JWT secrets!**
   ```
   JWT_SECRET=your-super-secret-key-here-make-it-long-and-random
   JWT_REFRESH_SECRET=another-different-secret-key-for-refresh-tokens
   ```

#### Frontend Configuration
1. Navigate to `frontend` folder
2. The default values should work, but verify in `frontend/.env`:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

### 3. Start MongoDB

**If using local MongoDB:**
```bash
# Windows
mongod

# Mac/Linux
sudo systemctl start mongod
# OR
brew services start mongodb-community
```

**If using MongoDB Atlas:** No action needed, it's already running in the cloud!

### 4. Seed the Database

This populates the database with question templates:

```bash
cd backend
npm run seed
```

You should see: `✅ Seeded 15 question templates`

### 5. Start the Application

#### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: ...
✅ Server running on port 5000
```

#### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:3000/
```

### 6. Access the Application

1. Open your browser and go to: **http://localhost:3000**
2. Click "Sign up" to create your account
3. Fill in your details:
   - Name
   - Email
   - Password (minimum 6 characters)
4. You'll be automatically logged in!

### 7. Try It Out

Now you can:
- ✍️ Create your first daily entry
- 💭 Answer the daily question
- 📅 View your calendar
- 🔄 Check scheduled revisions (after a few days)
- ⚙️ Customize settings

## Troubleshooting

### MongoDB Connection Failed
- **Local MongoDB**: Make sure MongoDB service is running
- **Atlas**: Check your connection string includes username, password, and cluster URL
- **Network**: Atlas requires IP whitelist (add `0.0.0.0/0` for development)

### Port Already in Use
If port 5000 or 3000 is already in use:

**Backend** - Edit `backend/.env`:
```
PORT=5001
```

**Frontend** - Edit `frontend/vite.config.js`:
```javascript
server: {
  port: 3001,
  // ...
}
```

### Cannot Find Module Errors
Delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install
```

### CORS Errors
Make sure `backend/.env` has the correct frontend URL:
```
CLIENT_URL=http://localhost:3000
```

## Verify Everything Works

Here's a quick checklist:

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can access login page
- [ ] Can create an account
- [ ] Can create a daily entry
- [ ] Can see today's question
- [ ] Calendar shows today with a dot
- [ ] Settings page loads

## Next Steps

Once everything is working:

1. **Create entries for multiple days** to see the revision system in action
2. **Explore the calendar view** to track your progress
3. **Check revisions** - items will appear 1, 3, and 7 days after entry
4. **Customize settings** - set your timezone and notification preferences

## Development Tips

- **Backend logs** show all API requests in terminal
- **Frontend hot reload** - changes appear instantly
- **MongoDB data** - Use MongoDB Compass to view database contents
- **API testing** - Use Postman or Thunder Client for direct API testing

## Production Deployment

For production deployment, see:
- Backend: Deploy to Railway, Render, or Heroku
- Frontend: Deploy to Vercel, Netlify, or Cloudflare Pages
- Database: Use MongoDB Atlas for production

## Need Help?

Common issues and solutions:

**Question:** MongoDB connection timeout
**Solution:** Check firewall, ensure MongoDB is running, verify connection string

**Question:** JWT token errors
**Solution:** Clear localStorage in browser developer tools, log in again

**Question:** Revisions not appearing
**Solution:** Revisions are scheduled for future dates (1, 3, 7 days later)

---

🎉 **You're all set!** Start building your daily reflection habit with TriLog.
