# 📋 Quick Reference - SREP StudyMate

**Last Updated:** December 15, 2025  
**Status:** ✅ Production-Ready

---

## 🚀 Quick Commands

### Development
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run type checking
pnpm tsc --noEmit

# Install dependencies
pnpm install
```

### Testing (if setup)
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Deployment
```bash
# Deploy to Vercel
vercel --prod

# Deploy to Railway
railway up
```

---

## 📁 Project Structure

```
srep-studymate/
├── app/                      # Next.js app router
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── documents/       # Document management
│   │   ├── flashcards/      # Flashcard generation
│   │   ├── mock-papers/     # Mock paper generation
│   │   ├── analysis/        # Performance analysis
│   │   └── schedule/        # Study schedule
│   ├── app/                 # Protected app pages
│   └── (auth)/              # Auth pages (login, signup)
├── lib/                     # Shared utilities
│   ├── models/              # MongoDB models
│   ├── auth.ts              # JWT authentication
│   ├── db.ts                # Database connection
│   ├── validations.ts       # Zod schemas ✨ NEW
│   ├── features.ts          # Feature flags ✨ NEW
│   ├── pagination.ts        # Pagination utils ✨ NEW
│   ├── monitoring.ts        # Error tracking ✨ NEW
│   └── logger.ts            # Structured logging
├── docs/                    # Documentation ✨ NEW
│   ├── BACKUP_GUIDE.md
│   ├── API_VERSIONING.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── UPTIME_MONITORING.md
│   └── PROJECT_COMPLETION.md
├── tests/                   # Test files ✨ NEW
│   └── README.md
└── components/              # React components
```

---

## 🔑 Environment Variables

### Required
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/srep

# Authentication
JWT_SECRET=your-super-secret-key-min-32-characters

# AI Service
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Optional
```bash
# Feature Flags
FEATURE_AI_GENERATION=true
FEATURE_PDF_EXPORT=false
FEATURE_BACKGROUND_JOBS=false

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxx

# Logging
LOG_LEVEL=info
```

---

## 📡 API Endpoints

### Authentication
```
POST /api/auth/signup        # Register new user
POST /api/auth/login         # Login user
GET  /api/auth/me            # Get current user
```

### Documents
```
GET    /api/documents        # List documents (paginated)
POST   /api/documents/upload # Upload document
DELETE /api/documents/:id    # Delete document (soft)
```

### Flashcards
```
GET  /api/flashcards              # List flashcard sets (paginated)
POST /api/flashcards/generate     # Generate flashcards from document
```

### Mock Papers
```
GET  /api/mock-papers             # List mock papers (paginated)
POST /api/mock-papers/generate    # Generate mock paper
```

### Analysis
```
GET  /api/analysis                # List analysis reports (paginated)
POST /api/analysis/generate       # Generate performance analysis
```

### Schedule
```
GET  /api/schedule                # Get study schedules
POST /api/schedule/generate       # Generate study schedule
```

### Monitoring
```
GET /api/health                   # Health check endpoint
GET /api/health/detailed          # Detailed health (auth required)
GET /api/metrics                  # Metrics endpoint (auth required)
```

---

## 🔍 Common Tasks

### Add New API Route
1. Create route file in `app/api/your-route/route.ts`
2. Import validation schema from `lib/validations.ts`
3. Import logger from `lib/logger.ts`
4. Use structured logging (not console.*)
5. Return proper error responses

Example:
```typescript
import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import logger from '@/lib/logger'
import { yourSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = yourSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        errors: validation.error.errors 
      }, { status: 400 })
    }

    // Your logic here
    logger.info('Action completed', { userId: payload.userId })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Action failed', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### Add Database Model
1. Create model file in `lib/models/YourModel.ts`
2. Add schema with fields
3. Add indexes for queries
4. Add soft delete support (deletedAt)
5. Export model

Example:
```typescript
import mongoose, { Schema } from 'mongoose'

const yourSchema = new Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  deletedAt: { type: Date, default: null, index: true },
  createdAt: { type: Date, default: Date.now },
})

// Indexes
yourSchema.index({ userId: 1, createdAt: -1 })

// Soft delete middleware
yourSchema.pre(/^find/, function() {
  this.where({ deletedAt: null })
})

export default mongoose.models.YourModel || mongoose.model('YourModel', yourSchema)
```

### Add Feature Flag
1. Edit `lib/features.ts`
2. Add feature to `features` object
3. Add environment variable to `.env.local`
4. Use in code: `isFeatureEnabled('yourFeature')`

Example:
```typescript
// lib/features.ts
export const features = {
  // ... existing features
  yourFeature: process.env.FEATURE_YOUR_FEATURE === 'true',
}

// In your code
import { isFeatureEnabled } from '@/lib/features'

if (isFeatureEnabled('yourFeature')) {
  // Feature is enabled
}
```

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check connection string
echo $MONGODB_URI

# Test connection
curl http://localhost:3000/api/health

# Check MongoDB Atlas:
# - IP whitelist (0.0.0.0/0 for all)
# - User credentials correct
# - Database name correct
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
pnpm build

# Check TypeScript errors
pnpm tsc --noEmit

# Check for missing dependencies
pnpm install
```

### Slow Performance
```bash
# Check database indexes
# Use MongoDB Atlas Performance Advisor

# Enable query profiling
# In MongoDB Atlas: Metrics → Profiler

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
```

Create `curl-format.txt`:
```
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
```

---

## 📖 Documentation Quick Links

- **[README.md](../README.md)** - Project overview
- **[IMPROVEMENTS_SUMMARY.md](../IMPROVEMENTS_SUMMARY.md)** - All improvements
- **[PROJECT_COMPLETION.md](PROJECT_COMPLETION.md)** - Completion report
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deploy to production
- **[BACKUP_GUIDE.md](BACKUP_GUIDE.md)** - Backup procedures
- **[UPTIME_MONITORING.md](UPTIME_MONITORING.md)** - Monitoring setup
- **[API_VERSIONING.md](API_VERSIONING.md)** - API versioning
- **[tests/README.md](../tests/README.md)** - Testing guide

---

## 🎯 Production Deployment Checklist

### Pre-Deploy
- [ ] All tests passing (if implemented)
- [ ] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] Environment variables ready
- [ ] MongoDB Atlas configured
- [ ] OpenRouter API key valid

### Deploy
- [ ] Choose platform (Vercel/Railway/AWS)
- [ ] Deploy application
- [ ] Set environment variables
- [ ] Configure custom domain (optional)

### Post-Deploy
- [ ] Test health endpoint: `/api/health`
- [ ] Test authentication flow
- [ ] Test AI generation
- [ ] Setup monitoring (UptimeRobot)
- [ ] Enable backups (MongoDB Atlas)
- [ ] Configure alerts

Full checklist: [docs/DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 💰 Estimated Costs

### Minimal Setup (Free)
- Vercel: Free (Hobby tier)
- MongoDB Atlas: Free (M0, 512MB)
- OpenRouter: Pay per use (~$5-10/mo)
- UptimeRobot: Free (50 monitors)
- **Total: ~$5-10/month**

### Production Setup
- Vercel: $20/mo (Pro)
- MongoDB Atlas: $25/mo (M10)
- OpenRouter: ~$20-50/mo (depends on usage)
- Sentry: $26/mo (50k events)
- Better Uptime: $20/mo
- **Total: ~$110-140/month**

See [docs/DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#cost-optimization) for details.

---

## 🆘 Getting Help

### Issues
- Check logs: `pnpm dev` output
- Check health: `http://localhost:3000/api/health`
- Check MongoDB: Atlas dashboard

### Resources
- **Next.js**: https://nextjs.org/docs
- **MongoDB**: https://www.mongodb.com/docs
- **Vercel**: https://vercel.com/docs
- **OpenRouter**: https://openrouter.ai/docs

### Community
- Next.js Discord: https://nextjs.org/discord
- MongoDB Community: https://community.mongodb.com

---

## ✨ What's New

### Latest Features ✨
- ✅ Pagination on all list endpoints
- ✅ Soft delete on all models
- ✅ Feature flags system
- ✅ Structured logging
- ✅ Zod validation
- ✅ Comprehensive documentation

### Coming Soon (Optional)
- [ ] Background job processing
- [ ] Real-time notifications
- [ ] PDF export functionality
- [ ] Collaboration features
- [ ] Advanced analytics

---

**Quick Start:** `pnpm dev` → http://localhost:3000  
**Deploy:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)  
**Questions:** Check [README.md](../README.md)

🚀 **Ready to launch!**
