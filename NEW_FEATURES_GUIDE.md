# TriLog - New Features Quick Guide

## 🎉 Recently Added Features (December 2025)

---

## 1. 📝 Edit & Delete Entries

### How to Edit an Entry:
1. Go to the **Calendar** page
2. Click on any day that has an entry (marked with a dot)
3. You'll be taken to the edit page
4. Make your changes and click **Save Changes**

### How to Delete an Entry:
1. Navigate to edit page (see above)
2. Click the red **Delete Entry** button at the bottom
3. Confirm the deletion
4. Entry and all associated revisions will be removed

**Note:** Deletions cannot be undone!

---

## 2. 👤 User Profile Management

### Access Your Profile:
- Click **Profile** in the left sidebar navigation

### What You Can Do:
- **View Statistics:**
  - Current streak (consecutive days with entries)
  - Total number of entries
  - Completed revisions count
  - Questions answered

- **Update Profile:**
  - Change your display name
  - Update your email address
  - View member since date

- **Change Password:**
  - Enter current password
  - Set new password (min 6 characters)
  - Confirm new password

---

## 3. 🔄 Enhanced Revision Workflow

### Completing Revisions:
1. Go to **Revisions** page
2. Click **Complete Review** on any pending revision
3. **New!** A form will appear with:
   - **Response textarea:** Write what you remember or learned
   - **Confidence slider:** Rate your understanding (1-5)
     - 1 = Need more review
     - 5 = Fully mastered
4. Click **Mark Complete** or **Cancel**

### Why This Helps:
- Better track your learning progress
- Identify topics needing more attention
- Build long-term retention through active recall

---

## 4. 📄 Pagination

### Revisions Page:
- Now shows **10 revisions per page**
- Use **Previous/Next** buttons to navigate
- Current page displayed: "Page X of Y"
- Automatically resets when changing filters

---

## 5. 🔒 Security Improvements (Behind the Scenes)

### Rate Limiting:
- **Login/Signup:** Maximum 5 attempts per 15 minutes
- **API Requests:** Maximum 100 requests per 15 minutes
- **Entry Creation:** Maximum 50 entries per hour

**If you hit a limit:** Wait 15 minutes before trying again

### What This Means:
- Better protection against brute force attacks
- More stable performance
- Prevents abuse

---

## 🎯 Tips & Best Practices

### Editing Entries:
- ✅ Edit entries to add context or corrections
- ✅ Add new revision items anytime
- ⚠️ Can't change the date of an entry
- ⚠️ Deleted entries are permanent

### Using Revisions:
- 💡 Write detailed responses for better retention
- 💡 Be honest with confidence ratings
- 💡 Lower confidence (1-2) means you should review more
- 💡 High confidence (4-5) means you've mastered it

### Profile Management:
- 📧 Email changes affect login credentials
- 🔐 Use strong, unique passwords
- 📊 Check stats regularly for motivation
- 🔥 Build streaks by making daily entries

---

## ⚡ Keyboard Shortcuts

- **Enter** in revision item input → Add item
- **Escape** can cancel forms (browser default)

---

## 🐛 Troubleshooting

### "Rate limit exceeded" error?
- **Solution:** Wait 15 minutes before trying again
- **Prevention:** Avoid rapid repeated actions

### Calendar day not clickable?
- **Reason:** No entry exists for that day
- **Solution:** Create an entry first using **New Entry**

### Can't change password?
- **Check:** Current password is correct
- **Check:** New password is at least 6 characters
- **Check:** Confirmation matches new password

### Stats not updating?
- **Solution:** Refresh the page
- **Note:** Stats calculate in real-time when page loads

---

## 📱 Coming Soon

- 🔍 Search and filter entries
- 📊 Advanced analytics dashboard
- 💾 Data export (JSON/CSV)
- 🚀 And more!

---

## 💬 Feedback

Found a bug or have a suggestion? Contact the development team!

---

**Last Updated:** December 14, 2025
**Version:** 1.5.0
