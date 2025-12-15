# API Versioning Strategy

## Overview

API versioning allows backward-compatible changes and feature rollouts without breaking existing clients.

## Implementation Approach

### Option 1: URL Path Versioning (Recommended)

```
/api/v1/documents
/api/v2/documents
```

**Pros:**
- Clear and explicit
- Easy to route
- Good for documentation

**Cons:**
- Code duplication
- More files to maintain

### Option 2: Header Versioning

```
GET /api/documents
Header: API-Version: 2
```

**Pros:**
- Cleaner URLs
- Easier to deprecate

**Cons:**
- Less visible
- Harder to test

### Option 3: Query Parameter

```
/api/documents?version=2
```

**Pros:**
- Flexible
- Easy to test

**Cons:**
- Cluttered URLs
- Easy to forget

## Recommended Structure

### Current Structure
```
app/api/
  ├── auth/
  ├── documents/
  ├── flashcards/
  └── ...
```

### Versioned Structure
```
app/api/
  ├── v1/
  │   ├── auth/
  │   ├── documents/
  │   └── ...
  ├── v2/
  │   ├── documents/ (new features)
  │   └── ...
  └── health/ (unversioned)
```

## Migration Plan

### Phase 1: Maintain Current API
- Keep all routes in `/api/*`
- This becomes implicit v1

### Phase 2: Add Version Routing
- Create `/api/v1/*` as alias to current
- Update clients to use `/api/v1/*`
- Monitor adoption

### Phase 3: Introduce v2
- Create `/api/v2/*` with new features
- Document breaking changes
- Provide migration guide

### Phase 4: Deprecate v1
- Announce deprecation (6 months notice)
- Add deprecation warnings
- Redirect to v2 after sunset

## Version Lifecycle

```
v1: Current (2025-12-15)
v2: Beta (2026-06-15) → Stable (2026-09-15)
v1: Deprecated (2026-09-15) → Sunset (2027-03-15)
```

## Breaking Changes Policy

### What Requires New Version

✅ **Breaking Changes** (New version required):
- Removing fields from response
- Changing field types
- Renaming fields
- Removing endpoints
- Changing authentication
- Modifying error codes

❌ **Non-Breaking Changes** (Same version):
- Adding new fields
- Adding new endpoints
- Adding optional parameters
- Improving error messages
- Performance optimizations

## Version Routing Helper

Create `lib/apiVersion.ts`:

```typescript
export function getApiVersion(request: Request): string {
  // Check header
  const headerVersion = request.headers.get('API-Version')
  if (headerVersion) return headerVersion
  
  // Check query param
  const url = new URL(request.url)
  const queryVersion = url.searchParams.get('version')
  if (queryVersion) return queryVersion
  
  // Default to v1
  return 'v1'
}

export function requireVersion(version: string) {
  return (handler: Function) => {
    return async (request: Request, ...args: any[]) => {
      const requestedVersion = getApiVersion(request)
      
      if (requestedVersion !== version) {
        return Response.json({
          error: `API version ${requestedVersion} not supported. Use version ${version}.`
        }, { status: 400 })
      }
      
      return handler(request, ...args)
    }
  }
}
```

## Client Implementation

### JavaScript/TypeScript

```typescript
const API_VERSION = 'v1'
const BASE_URL = `https://api.example.com/api/${API_VERSION}`

async function fetchDocuments() {
  const response = await fetch(`${BASE_URL}/documents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'API-Version': API_VERSION,
    }
  })
  return response.json()
}
```

### Environment-based Versioning

```typescript
// .env
NEXT_PUBLIC_API_VERSION=v1

// Client code
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1'
```

## Documentation Strategy

### API Docs Structure

```
docs/api/
  ├── v1/
  │   ├── README.md
  │   ├── auth.md
  │   ├── documents.md
  │   └── ...
  ├── v2/
  │   ├── README.md
  │   ├── MIGRATION.md
  │   └── ...
  └── deprecation-policy.md
```

### Changelog Format

```markdown
# API Changelog

## v2.0.0 (2026-09-15)

### Breaking Changes
- `GET /documents` now returns paginated results
- `documentId` changed from string to object

### New Features
- Added `/documents/batch` endpoint
- Support for cursor pagination

### Deprecated
- `GET /documents?limit=all` (use pagination)

## v1.0.0 (2025-12-15)
- Initial release
```

## Version Header Response

Add version info to all responses:

```typescript
return NextResponse.json({
  success: true,
  data: documents,
  meta: {
    version: 'v1',
    deprecationDate: null, // or '2027-03-15'
  }
})
```

## Monitoring

Track version usage:

```typescript
// lib/logger.ts
logger.info('API request', {
  version: getApiVersion(request),
  endpoint: request.url,
  userId: payload.userId,
})
```

## Communication Plan

### When Introducing v2

1. **6 months before**: Announce in docs
2. **3 months before**: Email all users
3. **1 month before**: Add deprecation warnings
4. **Release day**: Make v2 default for new apps
5. **3 months after**: Start redirecting v1 to v2
6. **6 months after**: Sunset v1

### Deprecation Notice Template

```json
{
  "error": null,
  "data": { ... },
  "_deprecation": {
    "message": "API v1 will be deprecated on 2027-03-15",
    "migrationGuide": "https://docs.example.com/migration/v1-to-v2",
    "supportEnds": "2027-03-15"
  }
}
```

## Best Practices

✅ **Do:**
- Version from day one
- Document breaking changes
- Give 6+ months notice
- Provide migration tools
- Monitor version adoption
- Keep v1 stable during transition

❌ **Don't:**
- Break compatibility without warning
- Support too many versions (max 2)
- Deprecate without migration path
- Make versioning overly complex

## Current Status

**Status:** Pre-versioning (all routes unversioned)

**Recommended Action:**
1. Move current routes to `/api/v1/`
2. Keep `/api/*` as aliases
3. Update frontend to use v1 explicitly
4. Monitor for 3 months
5. Plan v2 features

**Timeline:**
- Today: Add version routing helper
- +1 week: Create v1 structure
- +1 month: Update all clients
- +3 months: Review and plan v2

---

**Last Updated:** December 15, 2025  
**Next Review:** March 15, 2026
