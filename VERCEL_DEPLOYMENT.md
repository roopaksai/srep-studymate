# Vercel Deployment Guide

## Required Environment Variables

Add these in your Vercel Dashboard → Settings → Environment Variables:

### 1. MONGODB_URI (Required)
\`\`\`
mongodb+srv://roopak:hyMA38xFNjtIc9IB@cluster0.lxzxlsb.mongodb.net/srep_studymate?retryWrites=true&w=majority&appName=Cluster0
\`\`\`
- **Type**: Plain Text
- **Environment**: Production, Preview, Development

### 2. JWT_SECRET (Required)
Generate a secure random string:
\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`
Or use this for testing (CHANGE IN PRODUCTION):
\`\`\`
srep-studymate-jwt-secret-key-change-in-production-min-32-chars
\`\`\`
- **Type**: Secret
- **Environment**: Production, Preview, Development

### 3. OPENROUTER_API_KEY (Required)
\`\`\`
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
\`\`\`
- **Type**: Secret
- **Environment**: Production, Preview, Development

### 4. NEXT_PUBLIC_API_URL (Optional)
This will be auto-configured based on deployment URL. You can leave it empty or set it to:
\`\`\`
https://your-app-name.vercel.app/api
\`\`\`
- **Type**: Plain Text
- **Environment**: Production, Preview, Development

---

## Step-by-Step Deployment

### Step 1: Push to GitHub
\`\`\`bash
git add .
git commit -m "Add MongoDB and AI integration"
git push origin main
\`\`\`

### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository

### Step 3: Configure Environment Variables
1. In Vercel Dashboard → Settings → Environment Variables
2. Add all 3 required variables above
3. Make sure to select all environments (Production, Preview, Development)

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Visit your deployment URL

---

## MongoDB Atlas Configuration

### Allow Vercel IP Access
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
4. Or add specific Vercel IPs from [here](https://vercel.com/docs/deployments/networking)

### Verify Database User
- Username: `roopak`
- Password: `hyMA38xFNjtIc9IB`
- Database: `srep_studymate`
- Permissions: Read/Write

---

## Troubleshooting Common Issues

### Error: "MONGODB_URI is not defined"
**Fix**: Add `MONGODB_URI` environment variable in Vercel Dashboard

### Error: "JWT_SECRET is not defined"
**Fix**: Add `JWT_SECRET` environment variable in Vercel Dashboard

### Error: "Cannot connect to database"
**Fix**: 
1. Check MongoDB Atlas IP whitelist includes 0.0.0.0/0
2. Verify connection string is correct
3. Check database user has proper permissions

### Error: "AI generation failed"
**Fix**: 
1. Verify `OPENROUTER_API_KEY` is set in Vercel
2. Check OpenRouter API key is valid at https://openrouter.ai/keys
3. App will use fallback if API fails (this is normal)

### Build Errors
**Fix**:
1. Make sure all dependencies are in package.json
2. Check TypeScript errors: `npm run build` locally
3. Verify Node.js version matches (18.x or higher)

---

## Verify Deployment

After deployment, test these features:

1. ✅ Visit homepage
2. ✅ Sign up new user
3. ✅ Login
4. ✅ Upload document
5. ✅ Generate flashcards
6. ✅ Generate mock paper
7. ✅ Generate analysis
8. ✅ Create schedule

---

## Environment Variable Checklist

Before deploying, verify you have:

- [ ] MONGODB_URI set in Vercel
- [ ] JWT_SECRET set in Vercel
- [ ] OPENROUTER_API_KEY set in Vercel
- [ ] MongoDB Atlas allows access from 0.0.0.0/0
- [ ] Database user has read/write permissions
- [ ] Code pushed to GitHub

---

## Important Security Notes

1. **Never commit .env files** to GitHub (already in .gitignore)
2. **Use strong JWT_SECRET** in production (32+ random characters)
3. **Rotate API keys** periodically
4. **Monitor API usage** on OpenRouter dashboard
5. **Review MongoDB access logs** regularly

---

## Production URL Structure

After deployment, your URLs will be:
- Frontend: `https://your-app-name.vercel.app`
- API: `https://your-app-name.vercel.app/api`

The app will automatically detect production environment and adjust accordingly.

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- OpenRouter: https://openrouter.ai/docs
