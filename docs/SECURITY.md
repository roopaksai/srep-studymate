# Security Configuration Guide

## 🔐 Security Hardening Implementation

This document outlines the comprehensive security measures implemented in SREP StudyMate.

---

## ✅ Implemented Security Features

### 1. **Enhanced Security Middleware** ([lib/security.ts](../lib/security.ts))
- CORS validation with origin whitelist
- Request integrity validation
- Input sanitization (prevents XSS, SQL/NoSQL injection)
- Security headers (X-Frame-Options, CSP, etc.)
- Client IP tracking and rate limiting
- JWT strength validation

### 2. **Input Validation** ([lib/validation.ts](../lib/validation.ts))
- Zod schema validation for all inputs
- Strong password requirements (min 8 chars, uppercase, lowercase, numbers)
- File type and size validation
- MongoDB query sanitization
- ObjectId format validation

### 3. **Rate Limiting** (Applied to all routes)
- **Authentication**: 5 attempts/15min (login), 3/hour (signup)
- **Upload**: 20 uploads/hour
- **AI Generation**: 10-30 requests/hour
- **Read Operations**: 100-200 requests/15min
- IP-based tracking with in-memory storage

### 4. **Authentication Security**
- JWT tokens with 7-day expiration
- Bcrypt password hashing
- Token validation on every request
- Secure password comparison (timing-safe)

### 5. **Security Headers**
Applied to all responses:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'...
Permissions-Policy: geolocation=(), microphone=()...
```

---

## 🔑 Environment Variables (CRITICAL)

### Required Variables

Create a `.env.local` file with these variables:

```bash
# Database
MONGODB_URI=mongodb+srv://your-connection-string

# JWT Secret - MUST BE STRONG (min 32 characters)
JWT_SECRET=your-very-long-secret-key-min-32-characters-random

# AI Service
OPENROUTER_API_KEY=your-api-key-here

# App URL (Production)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Generate Strong JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

**⚠️ NEVER use the default JWT_SECRET in production!**

---

## 🛡️ Security Checklist

Before deploying to production:

- [ ] Generate strong JWT_SECRET (min 32 characters)
- [ ] Set NEXT_PUBLIC_APP_URL to production domain
- [ ] Verify MongoDB connection string doesn't expose credentials
- [ ] Review CORS allowed origins in [lib/security.ts](../lib/security.ts)
- [ ] Enable HTTPS only (no HTTP)
- [ ] Review rate limits for your expected traffic
- [ ] Set up monitoring and alerting
- [ ] Enable Vercel's security features (if applicable)
- [ ] Test all authentication flows
- [ ] Verify file upload restrictions work

---

## 📊 Security Testing

### Test Rate Limiting

```bash
# Test login rate limit (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### Test Input Validation

```bash
# Should reject invalid email
curl -X POST https://your-domain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"invalid","password":"Test123"}'

# Should reject weak password
curl -X POST https://your-domain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"weak"}'
```

### Test File Upload Security

```bash
# Should reject files > 30MB
curl -X POST https://your-domain.com/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@large-file.pdf" \
  -F "type=study-material"

# Should reject invalid file types
curl -X POST https://your-domain.com/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@malicious.exe" \
  -F "type=study-material"
```

---

## 🚨 Security Incidents

### If JWT_SECRET is Compromised:

1. **Immediately** change JWT_SECRET in environment variables
2. Redeploy application (invalidates all existing tokens)
3. Force all users to re-login
4. Review access logs for suspicious activity
5. Notify affected users if data breach occurred

### If Database Credentials are Exposed:

1. Change MongoDB password immediately
2. Update MONGODB_URI with new credentials
3. Review database logs for unauthorized access
4. Enable MongoDB IP whitelist if not already enabled
5. Enable MongoDB authentication logs

### If API Key is Exposed:

1. Rotate OPENROUTER_API_KEY immediately
2. Review usage logs for abuse
3. Monitor for unexpected AI generation costs
4. Consider adding usage quotas per user

---

## 📝 Security Routes Applied

### ✅ Secured Routes:
- `/api/auth/login` - Rate limited (5/15min)
- `/api/auth/signup` - Rate limited (3/hour)
- `/api/documents/upload` - Rate limited (20/hour) + file validation
- `/api/flashcards/generate` - Rate limited (10/hour) + auth required
- All other API routes - Standard rate limiting + auth

### Middleware Applied:
- CORS validation on all routes
- Security headers on all responses
- Input sanitization on all POST/PUT routes
- Authentication check on protected routes
- Request logging for auditing

---

## 🔄 Ongoing Security Maintenance

### Weekly:
- Review application logs for suspicious activity
- Check rate limit effectiveness
- Monitor failed authentication attempts

### Monthly:
- Update dependencies (`pnpm update`)
- Review and update security policies
- Test security features
- Audit user access patterns

### Quarterly:
- Perform security audit
- Review and rotate API keys
- Update security documentation
- Penetration testing (if applicable)

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 📞 Security Contact

For security issues, please contact:
- Email: [Your security email]
- Do NOT open public GitHub issues for security vulnerabilities

---

**Last Updated**: January 14, 2026
**Version**: 1.0
