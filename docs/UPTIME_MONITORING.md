# Uptime and Performance Monitoring Setup

## Overview

This guide covers setting up comprehensive monitoring for the SREP StudyMate application, including uptime monitoring, performance tracking, and alerting.

## Quick Start

### Option 1: UptimeRobot (Free)

**Best for:** Basic uptime monitoring, perfect for small projects

**Setup Steps:**

1. **Sign up**
   - Go to https://uptimerobot.com
   - Create free account (50 monitors)

2. **Create Monitors**

   **API Health Check:**
   ```
   Monitor Type: HTTP(s)
   URL: https://your-domain.com/api/health
   Monitoring Interval: 5 minutes
   Alert Contacts: Your email
   ```

   **Frontend Check:**
   ```
   Monitor Type: HTTP(s)
   URL: https://your-domain.com
   Monitoring Interval: 5 minutes
   Keyword Monitoring: "StudyMate" or "SREP"
   ```

   **Database Check:**
   ```
   Monitor Type: Keyword
   URL: https://your-domain.com/api/health
   Keyword: "database":"ok"
   Monitoring Interval: 5 minutes
   ```

3. **Setup Alerts**
   - Email notifications (free)
   - SMS notifications (paid)
   - Slack webhook (free with custom domain)
   - Discord webhook (free)

4. **Create Status Page**
   - UptimeRobot → Status Pages
   - Add all monitors
   - Share public link: https://stats.uptimerobot.com/your-page

### Option 2: Better Uptime (Paid - $20/mo)

**Best for:** Teams, advanced features, multiple integrations

**Features:**
- 10-second check intervals
- Global check locations
- Incident management
- Team collaboration
- Better UI/UX

**Setup:**
```
1. Sign up at https://betteruptime.com
2. Add monitor with your domain
3. Configure alert channels (Slack, PagerDuty, etc.)
4. Create status page
5. Set up on-call schedules
```

### Option 3: Pingdom (Paid - $15/mo)

**Best for:** Detailed performance metrics, transaction monitoring

**Features:**
- Page speed monitoring
- Real user monitoring
- Transaction monitoring
- Root cause analysis

## Application Monitoring

### Health Check Endpoint

Already created in deployment guide: [app/api/health/route.ts](app/api/health/route.ts)

**Test locally:**
```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "api": "ok",
  "database": "ok",
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### Extended Health Check

Create `app/api/health/detailed/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import mongoose from 'mongoose'
import Document from '@/lib/models/Document'
import User from '@/lib/models/User'

export async function GET(request: Request) {
  try {
    // Only allow authenticated admins
    const payload = await verifyAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Add admin check here if needed
    
    const checks = {
      timestamp: new Date().toISOString(),
      api: { status: 'ok', responseTime: 0 },
      database: { status: 'checking', responseTime: 0, collections: {} },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV,
    }

    // Database check with timing
    const dbStart = Date.now()
    try {
      if (mongoose.connection.readyState === 1) {
        // Check collections
        const [userCount, docCount] = await Promise.all([
          User.countDocuments(),
          Document.countDocuments(),
        ])

        checks.database = {
          status: 'ok',
          responseTime: Date.now() - dbStart,
          collections: {
            users: userCount,
            documents: docCount,
          },
        }
      } else {
        checks.database.status = 'disconnected'
      }
    } catch (error) {
      checks.database = {
        status: 'error',
        responseTime: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Check if any service is unhealthy
    const isHealthy = checks.api.status === 'ok' && checks.database.status === 'ok'
    const statusCode = isHealthy ? 200 : 503

    return NextResponse.json(checks, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

## Performance Monitoring

### Response Time Tracking

Create `lib/metrics.ts`:

```typescript
// Simple in-memory metrics (use Redis in production)
const metrics = {
  requests: 0,
  errors: 0,
  responseTimes: [] as number[],
  lastReset: Date.now(),
}

export function recordRequest(duration: number, success: boolean) {
  metrics.requests++
  if (!success) metrics.errors++
  metrics.responseTimes.push(duration)

  // Keep only last 1000 requests
  if (metrics.responseTimes.length > 1000) {
    metrics.responseTimes.shift()
  }

  // Reset daily
  if (Date.now() - metrics.lastReset > 24 * 60 * 60 * 1000) {
    metrics.requests = 0
    metrics.errors = 0
    metrics.responseTimes = []
    metrics.lastReset = Date.now()
  }
}

export function getMetrics() {
  const times = metrics.responseTimes
  const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  const sorted = [...times].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0

  return {
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0,
    responseTime: {
      avg: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
    },
    since: new Date(metrics.lastReset).toISOString(),
  }
}

export async function trackRequest<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  let success = true

  try {
    const result = await fn()
    return result
  } catch (error) {
    success = false
    throw error
  } finally {
    const duration = Date.now() - start
    recordRequest(duration, success)
    
    // Log slow requests
    if (duration > 2000) {
      console.warn(`Slow request: ${operation} took ${duration}ms`)
    }
  }
}
```

### Metrics Endpoint

Create `app/api/metrics/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { getMetrics } from '@/lib/metrics'

export async function GET(request: Request) {
  try {
    // Only allow authenticated admins
    const payload = await verifyAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const metrics = getMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
```

### Usage in API Routes

```typescript
import { trackRequest } from '@/lib/metrics'

export async function POST(request: Request) {
  return trackRequest('generate-flashcards', async () => {
    // Your existing code here
    const result = await generateFlashcards(document)
    return NextResponse.json(result)
  })
}
```

## Alert Configuration

### Webhook Integration

**Slack Webhook:**
```typescript
async function sendSlackAlert(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚨 *Alert*\n${message}`,
          },
        },
      ],
    }),
  })
}
```

**Discord Webhook:**
```typescript
async function sendDiscordAlert(message: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message,
      embeds: [
        {
          title: '🚨 Alert',
          description: message,
          color: 0xff0000,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  })
}
```

### Alert Thresholds

```typescript
// lib/monitoring.ts
export const ALERT_THRESHOLDS = {
  errorRate: 1, // Alert if error rate > 1%
  responseTime: 2000, // Alert if avg > 2000ms
  databaseResponseTime: 500, // Alert if DB queries > 500ms
  memoryUsage: 512, // Alert if memory > 512MB
  downtime: 60000, // Alert if down > 1 minute
}

export function checkThresholds(metrics: any) {
  const alerts = []

  if (metrics.errorRate > ALERT_THRESHOLDS.errorRate) {
    alerts.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`)
  }

  if (metrics.responseTime.avg > ALERT_THRESHOLDS.responseTime) {
    alerts.push(`Slow response time: ${metrics.responseTime.avg}ms`)
  }

  if (metrics.memory.heapUsed > ALERT_THRESHOLDS.memoryUsage) {
    alerts.push(`High memory usage: ${metrics.memory.heapUsed}MB`)
  }

  return alerts
}
```

## Monitoring Dashboard

### Simple HTML Dashboard

Create `public/dashboard.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>SREP StudyMate - Monitoring</title>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui; padding: 20px; max-width: 1200px; margin: 0 auto; }
    .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
    .status.ok { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
    .metric { display: inline-block; padding: 15px; margin: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .metric-value { font-size: 32px; font-weight: bold; }
    .metric-label { font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <h1>📊 SREP StudyMate Monitoring</h1>
  
  <div id="health" class="status">Loading...</div>
  
  <div id="metrics"></div>

  <script>
    async function fetchHealth() {
      const res = await fetch('/api/health')
      const data = await res.json()
      const el = document.getElementById('health')
      
      if (res.ok) {
        el.className = 'status ok'
        el.innerHTML = `
          ✅ All systems operational<br>
          Database: ${data.database}<br>
          Last check: ${new Date(data.timestamp).toLocaleString()}
        `
      } else {
        el.className = 'status error'
        el.innerHTML = `❌ System issues detected`
      }
    }

    async function fetchMetrics() {
      try {
        const res = await fetch('/api/metrics')
        const data = await res.json()
        const el = document.getElementById('metrics')
        
        el.innerHTML = `
          <div class="metric">
            <div class="metric-value">${data.requests}</div>
            <div class="metric-label">Total Requests</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.errors}</div>
            <div class="metric-label">Errors</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.errorRate.toFixed(2)}%</div>
            <div class="metric-label">Error Rate</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.responseTime.avg}ms</div>
            <div class="metric-label">Avg Response Time</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.responseTime.p95}ms</div>
            <div class="metric-label">P95 Response Time</div>
          </div>
        `
      } catch (error) {
        // Metrics require auth, skip if not available
      }
    }

    // Refresh every 30 seconds
    setInterval(() => {
      fetchHealth()
      fetchMetrics()
    }, 30000)

    // Initial load
    fetchHealth()
    fetchMetrics()
  </script>
</body>
</html>
```

## Log Management

### Structured Logging with Pino

Install (optional, for better logs):
```bash
pnpm add pino pino-pretty
```

Update `lib/logger.ts`:

```typescript
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

// Usage
logger.info({ userId: '123', action: 'login' }, 'User logged in')
logger.error({ error: err.message, stack: err.stack }, 'Failed to process')
logger.warn({ responseTime: 2500 }, 'Slow API response')
```

### Log Aggregation

**Option 1: Logtail (formerly LogDNA)**
```bash
# Install
pnpm add @logtail/node @logtail/pino

# Setup
import { Logtail } from '@logtail/node'
import { LogtailTransport } from '@logtail/pino'

const logtail = new Logtail(process.env.LOGTAIL_TOKEN)

export const logger = pino({
  transport: {
    target: '@logtail/pino',
    options: { logtail },
  },
})
```

**Option 2: Better Stack**
- Sign up at https://betterstack.com
- Create log source
- Get source token
- Add to environment: `LOGTAIL_TOKEN`

## Production Checklist

### Before Launch
- [ ] Health check endpoint working
- [ ] Uptime monitoring configured
- [ ] Status page created
- [ ] Alert channels setup (email/Slack)
- [ ] Error tracking enabled (Sentry)
- [ ] Backup monitoring enabled
- [ ] Performance metrics tracking
- [ ] Log aggregation setup (optional)

### Week 1
- [ ] Review all alerts
- [ ] Validate thresholds
- [ ] Check false positives
- [ ] Document incidents

### Monthly
- [ ] Review uptime reports
- [ ] Analyze performance trends
- [ ] Update alert thresholds
- [ ] Test alert channels

## Cost Summary

| Service | Free Tier | Paid Tier | Recommendation |
|---------|-----------|-----------|----------------|
| UptimeRobot | 50 monitors, 5min checks | $7/mo for 1min checks | Start with free |
| Better Uptime | - | $20/mo | Upgrade when scaling |
| Sentry | 5k events/mo | $26/mo for 50k | Free tier fine initially |
| Logtail | 1GB/mo | $8/mo for 5GB | Optional, use if needed |
| StatusPage.io | - | $29/mo | UptimeRobot has free |

**Estimated Cost:**
- Small app: $0 (all free tiers)
- Growing app: $20-50/mo
- Large app: $100+/mo

## Support

- UptimeRobot: https://uptimerobot.com/help
- Better Uptime: https://betteruptime.com/docs
- Sentry: https://docs.sentry.io
- Logtail: https://betterstack.com/docs/logs

---

**Last Updated:** December 15, 2025  
**Review Schedule:** Monthly  
**Next Review:** January 15, 2026
