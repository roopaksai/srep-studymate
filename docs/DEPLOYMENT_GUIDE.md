# Production Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Tests passing (if implemented)
- [ ] No console.log statements (use logger)
- [ ] Environment variables documented

### Security
- [ ] All secrets in environment variables
- [ ] No hardcoded API keys
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] CORS configured properly
- [ ] Rate limiting enabled (if applicable)
- [ ] File upload validation working

### Performance
- [ ] Database indexes verified
- [ ] Query projections in use
- [ ] Response compression enabled
- [ ] Image optimization configured
- [ ] API routes optimized

### Monitoring
- [ ] Error tracking setup (Sentry)
- [ ] Logging configured
- [ ] Uptime monitoring enabled
- [ ] Database backups scheduled
- [ ] Alerts configured

## Deployment Options

### Option 1: Vercel (Recommended)

**Pros:**
- Zero config for Next.js
- Automatic HTTPS
- Global CDN
- Serverless functions
- Free tier available

**Cons:**
- Function timeout limits (10s hobby, 60s pro)
- Cold starts

#### Steps:

1. **Install Vercel CLI**
```bash
pnpm add -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
# First deployment (interactive)
vercel

# Production deployment
vercel --prod
```

4. **Configure Environment Variables**
```bash
# Via CLI
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add OPENROUTER_API_KEY production

# Or via Vercel Dashboard:
# 1. Go to project settings
# 2. Navigate to Environment Variables
# 3. Add all variables from .env.local
```

5. **Configure Custom Domain (Optional)**
- Go to Vercel Dashboard → Settings → Domains
- Add your domain
- Update DNS records

#### Automatic Deployments

Connect GitHub repository:
1. Go to Vercel Dashboard
2. Import Git Repository
3. Select your repo
4. Configure build settings:
   - Framework: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
5. Add environment variables
6. Deploy

Every push to main branch auto-deploys!

### Option 2: Railway

**Pros:**
- Easy MongoDB hosting
- Persistent storage
- No cold starts
- Simple pricing

**Cons:**
- No free tier
- Starts at $5/month

#### Steps:

1. **Install Railway CLI**
```bash
npm i -g @railway/cli
```

2. **Login**
```bash
railway login
```

3. **Create Project**
```bash
railway init
```

4. **Add MongoDB Service**
```bash
railway add mongodb
```

5. **Deploy**
```bash
railway up
```

6. **Set Environment Variables**
```bash
railway variables set JWT_SECRET=your_secret
railway variables set OPENROUTER_API_KEY=your_key
```

### Option 3: AWS (EC2 + RDS)

**Pros:**
- Full control
- Scalable
- Mature platform

**Cons:**
- More complex setup
- Higher cost
- Requires DevOps knowledge

#### Steps:

1. **Launch EC2 Instance**
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t3.micro (free tier) or t3.small
   - Security Group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

2. **SSH into Instance**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. **Install Node.js and pnpm**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm
```

4. **Install Nginx**
```bash
sudo apt-get install nginx
```

5. **Clone Repository**
```bash
git clone https://github.com/yourusername/srep-studymate.git
cd srep-studymate
```

6. **Install Dependencies**
```bash
pnpm install
```

7. **Create Environment File**
```bash
nano .env.local
# Add all environment variables
```

8. **Build Application**
```bash
pnpm build
```

9. **Install PM2 (Process Manager)**
```bash
npm install -g pm2
```

10. **Start Application**
```bash
pm2 start pnpm --name "studymate" -- start
pm2 startup
pm2 save
```

11. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/studymate
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/studymate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

12. **Setup SSL with Let's Encrypt**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 4: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

Update `next.config.mjs`:
```javascript
export default {
  output: 'standalone',
  // ... rest of config
}
```

Build and run:
```bash
docker build -t studymate .
docker run -p 3000:3000 --env-file .env.local studymate
```

## Environment Variables Setup

### Required Variables

Create `.env.production`:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/srep?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# OpenRouter AI
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Feature Flags (optional)
FEATURE_AI_GENERATION=true
FEATURE_PDF_EXPORT=false
FEATURE_BACKGROUND_JOBS=false

# Monitoring (optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxx
```

### Security Best Practices

✅ **Do:**
- Use strong, random secrets (32+ characters)
- Rotate secrets regularly
- Use different secrets for prod/dev
- Never commit secrets to git
- Use environment variable management (Vercel, Railway, AWS Secrets Manager)

❌ **Don't:**
- Use default/example secrets
- Share secrets in Slack/email
- Hardcode secrets in code
- Use same secrets across environments

## Database Setup

### MongoDB Atlas (Production)

1. **Create Production Cluster**
   - Go to MongoDB Atlas
   - Create new cluster (M10+ for production)
   - Choose region closest to your app
   - Enable backups

2. **Configure Network Access**
   - Add IP whitelist: `0.0.0.0/0` (Vercel) or specific IPs (EC2)
   - For Vercel, whitelist all IPs

3. **Create Database User**
   - Strong password (20+ characters)
   - ReadWrite permissions

4. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` and `<dbname>`

5. **Enable Performance Advisor**
   - MongoDB Atlas → Performance → Enable
   - Review index recommendations

## Post-Deployment

### 1. Health Check

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'

export async function GET() {
  const checks = {
    api: 'ok',
    database: 'checking',
    timestamp: new Date().toISOString(),
  }

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      checks.database = 'ok'
    } else {
      checks.database = 'disconnected'
    }
  } catch (error) {
    checks.database = 'error'
  }

  const allHealthy = Object.values(checks).every(status => status === 'ok')
  const statusCode = allHealthy ? 200 : 503

  return NextResponse.json(checks, { status: statusCode })
}
```

Test: `curl https://your-domain.com/api/health`

### 2. Setup Monitoring

**Uptime Monitoring:**
- UptimeRobot (free): https://uptimerobot.com
- Pingdom
- StatusCake
- Set check interval: 5 minutes
- Alert via email/SMS

**Application Monitoring:**
- Install Sentry (see lib/monitoring.ts)
- Configure alerts for errors
- Set up performance monitoring

### 3. Configure Alerts

**Critical Alerts:**
- API down (5xx errors)
- Database connection failures
- High error rate (>1%)
- Slow response times (>2s)

**Warning Alerts:**
- Elevated error rate (>0.5%)
- Database slow queries (>500ms)
- High memory usage (>80%)

### 4. Performance Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 https://your-domain.com/api/health

# Expected results:
# - Requests per second: >100
# - Time per request: <100ms
# - Failed requests: 0
```

### 5. Security Scan

```bash
# Install OWASP ZAP or use online scanner
# Run security scan
npm install -g snyk
snyk test

# Check for vulnerabilities
pnpm audit

# Fix if needed
pnpm audit fix
```

## Scaling

### Horizontal Scaling (Multiple Instances)

**Vercel:**
- Automatic scaling
- No configuration needed

**AWS:**
- Use Elastic Load Balancer
- Auto Scaling Groups
- Configure min/max instances

**Railway:**
- Add replicas in dashboard
- Load balancer included

### Database Scaling

**Read Replicas:**
- MongoDB Atlas: M10+ tier
- Configure read preference
- Use replicas for analytics

**Sharding:**
- M30+ tier required
- Shard by userId
- Configure shard key

### Caching

**In-Memory Cache (Redis):**
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// Cache AI responses
const cacheKey = `flashcards:${documentId}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const result = await generateFlashcards(document)
await redis.setex(cacheKey, 3600, JSON.stringify(result)) // 1 hour TTL

return result
```

**CDN Caching:**
- Vercel: Automatic for static assets
- CloudFlare: Add in front of app
- Configure cache headers

## Rollback Plan

### Vercel
```bash
# List deployments
vercel list

# Rollback to previous
vercel rollback [deployment-url]
```

### AWS/Railway
```bash
# Revert git commit
git revert HEAD
git push

# Redeploy
railway up # or your deployment command
```

### Database Rollback
```bash
# Restore from backup (see BACKUP_GUIDE.md)
mongorestore --uri="$MONGODB_URI" ./backup-2025-12-15
```

## Common Issues

### Issue: Build Fails

**Cause:** Missing environment variables or TypeScript errors

**Solution:**
```bash
# Check build locally
pnpm build

# Fix TypeScript errors
pnpm tsc --noEmit
```

### Issue: Database Connection Fails

**Cause:** Wrong connection string or IP not whitelisted

**Solution:**
- Verify MONGODB_URI
- Check MongoDB Atlas network access
- Test connection locally

### Issue: AI Generation Fails

**Cause:** Invalid OpenRouter API key or quota exceeded

**Solution:**
- Verify OPENROUTER_API_KEY
- Check OpenRouter dashboard for quota
- Add error handling and user feedback

### Issue: Slow Performance

**Cause:** Missing indexes or inefficient queries

**Solution:**
- Review MongoDB Performance Advisor
- Add indexes where needed
- Use query projections (.select())
- Enable caching

## Monitoring Checklist

### Daily
- [ ] Check error rates (Sentry)
- [ ] Review API response times
- [ ] Verify uptime (UptimeRobot)

### Weekly
- [ ] Review logs for patterns
- [ ] Check database performance
- [ ] Review resource usage
- [ ] Test backups

### Monthly
- [ ] Security audit
- [ ] Dependency updates
- [ ] Performance review
- [ ] Cost optimization

## Cost Optimization

### Vercel
- Free: Hobby plan (non-commercial)
- $20/month: Pro plan
- Optimize: Use ISR, reduce function calls

### MongoDB Atlas
- Free: M0 (512MB, shared)
- $9/month: M2 (2GB)
- $25/month: M10 (10GB, prod recommended)
- Optimize: Archive old data, use projections

### OpenRouter
- Pay per token
- ~$0.001 per 1K tokens (GPT-3.5-turbo)
- Optimize: Cache responses, use smaller models

**Estimated Monthly Cost:**
- Small app (<1000 users): $30-50
- Medium app (<10,000 users): $100-200
- Large app (>10,000 users): $500+

## Support

- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/support
- MongoDB: https://support.mongodb.com
- OpenRouter: https://openrouter.ai/docs

---

**Last Updated:** December 15, 2025  
**Deployment Status:** Ready for production
