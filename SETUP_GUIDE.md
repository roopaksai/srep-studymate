# SREP Setup Guide - Quick Start

## Step 1: Prerequisites
- Node.js v18 or higher
- MongoDB connection (local or cloud)
- Git (for cloning)

## Step 2: Install & Configure

\`\`\`bash
# Clone repository
git clone <repo-url>
cd srep

# Install dependencies
npm install

# Create .env.local with your MongoDB connection
cat > .env.local << EOF
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/srep
JWT_SECRET=change-this-to-random-string-at-least-32-chars-long
NEXT_PUBLIC_API_URL=http://localhost:3000/api
EOF
\`\`\`

## Step 3: Get MongoDB URI

### Option A: Local MongoDB
\`\`\`bash
# If you have MongoDB installed locally
MONGODB_URI=mongodb://localhost:27017/srep
\`\`\`

### Option B: MongoDB Atlas (Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Click "Connect" → "Drivers" → Copy connection string
5. Replace `<password>` with your database password
6. Paste into `.env.local`

## Step 4: Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000 in your browser.

## Step 5: Test the App

1. **Sign Up**: Click "Signup" → Create account with email/password
2. **Upload Document**: Drag & drop a .txt, .pdf, or .docx file
3. **Generate Content**:
   - Click "Generate Flashcards" → View flip cards
   - Click "Generate Mock Paper" → See questions and marks
   - Click "Analyse Answer" → Upload answer script → See report
   - Click "Create Schedule" → Set dates and topics → View timetable

## Build for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Deploy to Vercel

\`\`\`bash
# Push to GitHub first
git push origin main

# Then go to https://vercel.com and import your GitHub repository
# Set environment variables in Vercel dashboard
# Deploy!
\`\`\`

## Troubleshooting

**"MongoDB connection failed"**
- Check MONGODB_URI in .env.local
- Verify MongoDB is running (if local)
- Check MongoDB Atlas IP whitelist if using cloud

**"Cannot POST /api/auth/signup"**
- Ensure dev server is running: `npm run dev`
- Clear browser cache
- Check browser console for errors

**"Token expired"**
- Logout and login again
- This is expected after 7 days

**File upload not working**
- Check file is smaller than 5MB
- Verify file type is .txt, .pdf, or .docx

## Key Features Testing

### 1. Authentication ✓
- Signup with new email
- Login with credentials
- Logout clears token

### 2. Document Management ✓
- Upload study material
- See uploaded files listed
- Select file for features

### 3. Flashcards ✓
- Generate from document
- Flip card to see answer
- Navigate between cards

### 4. Mock Papers ✓
- Generate questions automatically
- See marks for each question
- Total marks calculated

### 5. Analysis ✓
- Upload answer script
- See AI-generated feedback
- View strengths/weaknesses
- Read recommendations

### 6. Scheduler ✓
- Set date range
- Add topics (comma-separated)
- Generate schedule
- View timetable

## Performance Tips

- Keep documents under 2MB
- Use Firefox/Chrome for best compatibility
- Clear browser cache if having issues
- Use Ctrl+Shift+Delete to clear localStorage

## Support

Having issues? 
1. Check browser console (F12)
2. Review .env.local configuration
3. Restart dev server
4. Create GitHub issue with error details

---

**Ready to help students ace their exams! 🎓**
